/* @flow */

import type { Model } from "./model";
import type { InflightMessage, Message, Subscriptions } from "./message";

import { debugAssert } from "./assert";
import { findMatchingSubscription } from "./message";
import { EventEmitter } from "./eventemitter";

export type StatePath = Array<string>;

/**
 * A snapshot of the state of the application, can be used to restore the state
 * provided the requisite state-definitions have been loaded.
 */
export type Snapshot = { [instanceName: string]: StateSnapshot };
export type StateSnapshot = {
  /**
   * Name to use to find the model when loading the snapshot
   */
  id: string,
  data: mixed,
  nested: Snapshot,
};

/**
 * Supervisor is a parent state or a storage instance.
 *
 * NOTE: Essentially the same as AbstractSupervisor, just that this type is
 * closed to make it possible to differentiate between the two types while
 * traversing the tree.
 */
export type Supervisor = Storage | State<any, any>;

export type Listener<M: Message> = (message: M, sourcePath: StatePath) => mixed;
export type Subscriber<M: Message> = { listener: Listener<M>, subscriptions: Subscriptions<M> };

export type StateMap = { [name: string]: State<any, any> };

export type StorageEvents = {
  /**
   * Emitted when a message did not find any active subscriber.
   *
   * Parameters:
   *
   *  * Message
   *  * Path to the origin state
   */
  unhandledMessage: [Message, StatePath],
  /**
   * Emitted when a state is created.
   *
   * Parameters:
   *
   *  * Path to the new state
   *  * Initial data supplied to the state
   *  * State data
   */
  stateCreated: [StatePath, mixed, mixed],
  /**
   * Emitted when a state is removed.
   *
   * Parameters:
   *
   * * Path to removed state
   * * State data
   */
  stateRemoved: [StatePath, mixed],
  /**
   * Emitted when a state-instance updates its data.
   *
   * Parameters:
   *
   *  * The new data
   *  * Path to the new state
   *  * Message which caused the update
   */
  stateNewData: [mixed, StatePath, Message],
  /**
   * Emitted when a message is queued for processing.
   *
   * Parameters:
   *
   *  * The message
   *  * Path of the origin, the closest state + the event source name
   */
  messageQueued: [Message, StatePath],
  /**
   * Emitted when a message is queued for processing.
   *
   * Parameters:
   *
   *  * The message
   *  * Path of the matching state-instance
   *  * If the subscription was passive
   */
  messageMatched: [Message, StatePath, boolean],
  /**
   * Emitted when a snapshot is going to be restored.
   *
   * Parameters:
   *
   *  * The snapshot to be restored.
   */
  snapshotRestore: [Snapshot],
  /**
   * Emitted after a snapshot has been restored.
   */
  snapshotRestored: [],
};

export type StateEvents<T> = {
  /**
   * Emitted when a state-instance updates its data.
   *
   * Parameters:
   *
   *  * The new data
   *  * Path to the new state
   *  * Message which caused the update
   */
  stateNewData: [T, StatePath, Message],
};

interface AbstractSupervisor {
  _nested: StateMap,
  getStorage(): Storage,
  getPath(): StatePath,
  getState<T, I, M>(model: Model<T, I, M>, name?: string): ?State<T, I>,
  createState<T, I, M>(model: Model<T, I, M>, params: I, name?: string): State<T, I>,
  sendMessage(message: Message, sourceName?: string): void,
  removeState<T, I, M>(model: Model<T, I, M>, name?: string): void,
}

const ANONYMOUS_SOURCE = "$";
const BROADCAST_SOURCE = "@";
const REPLY_SOURCE = "<";

/**
 * Base node in a state-tree, anchors all states and carries all data.
 */
export class Storage extends EventEmitter<StorageEvents> implements AbstractSupervisor {
  _subscribers: Array<Subscriber<any>> = [];
  _nested: StateMap = {};
  /**
   * Models, used for subscribers, updates and messages.
   */
  _defs: { [id: string]: Model<any, any, any> } = {};

  /* eslint-disable no-useless-constructor */
  // Explicit constructor results in shorter minified code
  constructor(): void {
    super();
  }
  /* eslint-enable no-useless-constructor */

  /**
   * Returns the Storage backing all state in this tree.
   */
  getStorage(): Storage {
    return this;
  }

  /**
   * Returns the path to this state.
   */
  getPath(): StatePath {
    return [];
  }

  /**
   * Adds the supplied model to the Storage so it can be used when
   * using restoreSnapshot(). Throws if a model with the same id already exist.
   */
  addModel<T, I, M>(model: Model<T, I, M>): void {
    if (!tryAddModel(this, model)) {
      // FIXME: Proper exception type
      throw new Error(`Duplicate model '${model.id}'.`);
    }
  }

  /**
   * Returns the model with the given id, if it exists.
   */
  getModel<T, I, M>(id: string): ?Model<T, I, M> {
    return this._defs[id];
  }

  /**
   * Returns the nested State for the given model and name if it
   * exists, name defaults to model id.
   */
  getState<T, I, M>(model: Model<T, I, M>, name?: string): ?State<T, I> {
    return getState(this, model, name);
  }

  /**
   * Attempts to retrieve the nested State for the given model and name,
   * if it does not exist it will be created, name defaults to model id.
   */
  createState<U, J, N>(model: Model<U, J, N>, params: J, name?: string): State<U, J> {
    return createState(this, model, params, name);
  }

  /**
   * Removes the nested State for the given model and name if it exists,
   * name defaults to model id.
   */
  removeState<U, J, N>(model: Model<U, J, N>, name?: string): void {
    const inst = getState(this, model, name);

    if (inst) {
      delete this._nested[name || inst._name];

      this.emit("stateRemoved", inst.getPath(), inst._data);
    }
  }

  /**
   * Sends the given message to any matching State or Subscriber in the
   * state-tree.
   */
  sendMessage(message: Message, sourceName?: string = ANONYMOUS_SOURCE): void {
    processStorageMessage(this, createInflightMessage(this, [sourceName], message));
  }

  /**
   * Adds a listener subscribing to the messages matching the given
   * subscriptions.
   */
  addSubscriber<M: Message>(listener: Listener<M>, subscriptions: Subscriptions<M>): void {
    this._subscribers.push({ listener, subscriptions });
  }

  /**
   * Removes the supplied listener.
   */
  removeSubscriber(listener: Listener<any>): void {
    const { _subscribers } = this;

    for (let i = 0; i < _subscribers.length; i++) {
      if (_subscribers[i].listener === listener) {
        _subscribers.splice(i, 1);

        return;
      }
    }
  }

  /**
   * Sends a message to all state-instances currently reachable from this
   * Storage instance.
   */
  broadcastMessage(msg: Message, sourceName?: string = BROADCAST_SOURCE): void {
    handleBroadcast(
      this,
      [],
      this._nested,
      createInflightMessage(this, [sourceName], msg)
    ).forEach((m: InflightMessage): void => processStorageMessage(this, m));
  }

  /**
   * Looks up the closest matching State for the given path, then sends the
   * supplied message to all matching States and Subscribers.
   */
  replyMessage(msg: Message, targetState: StatePath, sourceName?: string = REPLY_SOURCE): void {
    const instance = findClosestSupervisor(this, targetState);
    const inflight = [createInflightMessage(this, targetState.concat(sourceName), msg)];

    processInstanceMessages(this, instance, inflight);
  }

  /**
   * Creates a snapshot of the current state-tree. State-data will not be
   * copied.
   */
  getSnapshot(): Snapshot {
    return createSnapshot(this);
  }

  /**
   * Attempts to restore a snapshot. Will throw if required models are missing.
   */
  restoreSnapshot(snapshot: Snapshot): void {
    this.emit("snapshotRestore", snapshot);

    restoreSnapshot(this, this, snapshot);

    this.emit("snapshotRestored");
  }
}

/**
 * Object representing an instance of a Model.
 */
export class State<T, I>
  extends EventEmitter<StateEvents<T>>
  implements AbstractSupervisor {
  /**
   * Matches the Storage _defs collection.
   */
  _id: string;
  /**
   * Matches the key used in the supervisor's `_nested` collection.
   */
  _name: string;
  _data: T;
  _supervisor: Supervisor;
  _nested: StateMap = {};

  constructor(id: string, supervisor: Supervisor, data: TypeofModelData<M>, name: string): void {
    super();

    this._id = id;
    this._name = name;
    this._supervisor = supervisor;
    this._data = data;
  }

  /**
   * Returns the name of this State.
   */
  getName(): string {
    return this._name;
  }

  /**
   * Returns the data contained in this State.
   */
  getData(): T {
    return this._data;
  }

  /**
   * Returns the Storage backing all state in this tree.
   */
  getStorage(): Storage {
    let s = this._supervisor;

    while (s instanceof State) {
      s = s._supervisor;
    }

    return s;
  }

  /**
   * Returns the path to this state.
   */
  getPath(): StatePath {
    const path = [];
    let s = this;

    while (s instanceof State) {
      path.unshift(s._name);

      s = s._supervisor;
    }

    return path;
  }

  /**
   * Returns the nested State for the given model and name if it
   * exists, name defaults to model id.
   */
  getState<U, J, N>(model: Model<U, J, N>, name?: string): ?State<U, J> {
    return getState(this, model, name);
  }

  /**
   * Attempts to retrieve the nested State for the given model and name,
   * if it does not exist it will be created, name defaults to model id.
   */
  createState<U, J, N>(model: Model<U, J, N>, params: J, name?: string): State<U, J> {
    return createState(this, model, params, name);
  }

  /**
   * Removes the nested State for the given model and name if it exists,
   * name defaults to model id.
   */
  removeState<U, J, N>(model: Model<U, J, N>, name?: string): void {
    const inst = getState(this, model, name);

    if (inst) {
      delete this._nested[name || inst._name];

      this.getStorage().emit("stateRemoved", inst.getPath(), inst._data);
    }
  }

  /**
   * Sends the given message to any matching State or Subscriber in the
   * state-tree.
   */
  sendMessage(message: Message, sourceName?: string = ANONYMOUS_SOURCE): void {
    const storage = this.getStorage();
    const msgPath = this.getPath().concat([sourceName]);

    processInstanceMessages(storage, this, [createInflightMessage(storage, msgPath, message)]);
  }
}

export function getState<T, I, M>(
  supervisor: Supervisor,
  model: Model<T, I, M>,
  name?: string
): ?State<T, I> {
  if (process.env.NODE_ENV !== "production") {
    ensureModel(supervisor.getStorage(), model);
  }

  const inst = supervisor._nested[name || model.id];

  if (inst) {
    debugAssert(inst._name === (name || model.id),
      `State name '${inst._name}' does not match key name '${name || model.id}`);
  }

  return inst;
}

export function restoreSnapshot(
  storage: Storage,
  supervisor: Supervisor,
  snapshot: Snapshot
): void {
  const newNested: StateMap = {};

  /* eslint-disable guard-for-in */
  // We trust that the user has not been poking around in globals
  for (const k in snapshot) {
  /* eslint-enable guard-for-in */
    const { id, data, nested } = snapshot[k];

    // Ensure the model exists when we restore
    getModelById(storage, id);

    const inst = new State(id, supervisor, data, k);

    restoreSnapshot(storage, inst, nested);

    newNested[k] = inst;
  }

  supervisor._nested = newNested;
}

/**
  * Loads the given model for use, ensures that it is not a new model with the
  * same name if it is already loaded. `true` returned if it was new, `false`
  * otherwise.
  */
export function tryAddModel<T, I, M>(storage: Storage, model: Model<T, I, M>): boolean {
  const { id } = model;

  if (!storage._defs[id]) {
    storage._defs[id] = model;

    return true;
  }

  ensureModel(storage, model);

  return false;
}

export function ensureModel<T, I, M>(storage: Storage, model: Model<T, I, M>): void {
  const { id } = model;

  if (storage._defs[id] && storage._defs[id] !== model) {
    // FIXME: Proper exception type
    throw new Error(`Model mismatch for '${id}'.`);
  }
}

export function getModelById<T, I, M: Message>(
  storage: Storage,
  id: string
): Model<T, I, M> {
  const spec = storage._defs[id];

  if (!spec) {
    // TODO: Error type
    throw new Error(`Missing model for state '${id}'.`);
  }

  return spec;
}

export function createState<T, I, M>(
  supervisor: Supervisor,
  model: Model<T, I, M>,
  params: I,
  name?: string
): State<T, I> {
  const child = getState(supervisor, model, name);

  if (child) {
    // TODO: Probably just move this to the react adapter
    // TODO: Diff and send message if the params are different

    return child;
  }

  return newState(supervisor, model, params, name);
}

export function newState<T, I, M>(
  supervisor: Supervisor,
  model: Model<T, I, M>,
  initialData: I,
  name?: string
): State<T, I> {
  const storage = supervisor.getStorage();
  const { id, init } = model;

  if (!name) {
    name = id;
  }

  tryAddModel(storage, model);

  const { data, messages } = init(initialData);
  const instance = new State(id, supervisor, data, name);
  const path = instance.getPath();

  supervisor._nested[name] = instance;

  storage.emit("stateCreated", path, (initialData: any), data);

  if (messages) {
    processInstanceMessages(
      storage,
      instance._supervisor,
      messages.map((m: Message): InflightMessage => createInflightMessage(storage, path, m))
    );
  }

  return instance;
}

export function createInflightMessage(
  storage: Storage,
  source: StatePath,
  message: Message
): InflightMessage {
  storage.emit("messageQueued", message, source);

  return {
    _message: message,
    _source: source,
    _received: false,
  };
}

export function findClosestSupervisor(supervisor: Supervisor, path: StatePath): Supervisor {
  for (const p of path) {
    if (!supervisor._nested[p]) {
      return supervisor;
    }

    supervisor = supervisor._nested[p];
  }

  return supervisor;
}

export function enqueueMessages(
  storage: Storage,
  source: StatePath,
  inflight: Array<InflightMessage>,
  messages: Array<Message>
): void {
  for (const m of messages) {
    inflight.push(createInflightMessage(storage, source, m));
  }
}

export function processInstanceMessages(
  storage: Storage,
  instance: Supervisor,
  inflight: Array<InflightMessage>
): void {
  let sourcePath = instance.getPath();

  while (instance instanceof State) {
    processMessages(storage, instance, sourcePath, inflight);

    // Traverse down one level
    sourcePath = sourcePath.slice(0, -1);
    instance = instance._supervisor;
  }

  for (const i of inflight) {
    processStorageMessage(storage, i);
  }
}

export function processMessages(
  storage: Storage,
  instance: State<any, any>,
  sourcePath: StatePath,
  inflight: Array<InflightMessage>
): void {
  const definition = getModelById(storage, instance._id);

  // We are going to add to messages if any new messages are generated, save
  // length here
  const currentLimit = inflight.length;
  const { update, subscribe } = definition;

  // We need to be able to update the filters if the data changes
  let messageFilter = subscribe(instance._data);

  // TODO: Emit event? that we are considering messags for state?

  for (let i = 0; i < currentLimit; i++) {
    const currentInflight = inflight[i];
    const { _message: m } = currentInflight;
    const match = findMatchingSubscription(messageFilter, m, currentInflight._received);

    if (match) {
      if (!match.isPassive) {
        currentInflight._received = true;
      }

      storage.emit("messageMatched", m, sourcePath, match.isPassive);

      const updateRequest = update(instance._data, m);

      if (updateRequest) {
        const { data, messages } = updateRequest;

        instance._data = data;

        storage.emit("stateNewData", data, sourcePath, m);
        instance.emit("stateNewData", data, sourcePath, m);

        if (messages) {
          enqueueMessages(storage, sourcePath, inflight, messages);
        }

        // TODO: Skip on last iteration?
        messageFilter = subscribe(instance._data);
      }
    }

    // No Match
  }
}

export function processStorageMessage(storage: Storage, inflight: InflightMessage): void {
  const { _subscribers: s } = storage;
  const { _message, _source } = inflight;
  let received = inflight._received;

  for (const { listener, subscriptions } of s) {
    const match = findMatchingSubscription(subscriptions, _message, received);

    if (match) {
      if (!match.isPassive) {
        received = true;
      }

      storage.emit("messageMatched", _message, [], match.isPassive);

      listener(_message, _source);
    }
  }

  if (!received) {
    storage.emit("unhandledMessage", _message, _source);
  }
}

/**
 * Broadcasts msg to all state instances with a depth first algo.
 *
 * Mutates msg
 */
export function handleBroadcast(
  storage: Storage,
  path: StatePath,
  nested: StateMap,
  msg: InflightMessage
): Array<InflightMessage> {
  const returning = [msg];

  /* eslint-disable guard-for-in */
  // We trust that the user has not been poking around in globals
  for (const key in nested) {
  /* eslint-enable guard-for-in */
    const instance = nested[key];
    const nestedPath = path.concat([key]);
    const messages = handleBroadcast(storage, nestedPath, instance._nested, msg);
    const hasBeenReceived = msg._received;

    msg._received = false;

    // We modify messages
    processMessages(storage, instance, nestedPath, messages);

    // Propagate the received flag
    msg._received = msg._received || hasBeenReceived;

    // We have multiple instances of msg here now, one from each child
    // deduplicate.
    for (const m of messages) {
      if (returning.indexOf(m) === -1) {
        returning.push(m);
      }
    }
  }

  return returning;
}

export function createSnapshot(node: Supervisor): Snapshot {
  return Object.keys(node._nested).reduce((a: Snapshot, key: string): Snapshot => {
    const nested = node._nested[key];

    a[key] = {
      id: nested._id,
      // We assume it is immutably updated
      data: nested._data,
      nested: createSnapshot(nested),
    };

    return a;
  }, {});
}
