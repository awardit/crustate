/* @flow */

import type { Model, StatePath } from "./state";
import type { InflightMessage, Message, Subscriptions } from "./message";

import { debugAssert } from "./assert";
import {
  updateHasData,
  updateStateData,
  updateStateDataNoNone,
  updateOutgoingMessages,
} from "./update";
import { findMatchingSubscription } from "./message";
import { EventEmitter } from "./eventemitter";

/**
 * A snapshot of the state of the application, can be used to restore the state
 * provided the requisite state-definitions have been loaded.
 */
export type Snapshot = { [instanceName: string]: StateSnapshot };
export type StateSnapshot = {
  // Name to use to find the model when loading the snapshot
  id: string,
  data: mixed,
  params: mixed,
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

export type Sink<M: Message> = (message: M, sourcePath: StatePath) => mixed;
export type Subscriber<M: Message> = { listener: Sink<M>, subscriptions: Subscriptions<M> };

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
  getNested<T, I, M>(model: Model<T, I, M>, name?: string): ?State<T, I>,
  getNestedOrCreate<T, I, M>(model: Model<T, I, M>, params: I, name?: string): State<T, I>,
  sendMessage(message: Message, sourceName?: string): void,
  removeNested<T, I, M>(model: Model<T, I, M>, name?: string): void,
}

const ANONYMOUS_SOURCE = "$";
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

  getStorage(): Storage {
    return this;
  }

  getPath(): StatePath {
    return [];
  }

  /**
   * Test
   */
  registerModel<T, I, M>(model: Model<T, I, M>): void {
    if( ! this.tryRegisterModel(model)) {
      // FIXME: Proper exception type
      throw new Error(`Duplicate model '${model.name}'.`);
    }
  }

  /**
   * Loads the given model for use, ensures that it is not a new model with the
   * same name if it is already loaded. `true` returned if it was new, `false`
   * otherwise.
   */
  tryRegisterModel<T, I, M>(model: Model<T, I, M>): boolean {
    const { name: id } = model;

    if( ! this._defs[id]) {
      this._defs[id] = model;

      return true;
    }

    ensureModel(this, model);

    return false;
  }

  getModel<T, I, M>(id: string): ?Model<T, I, M> {
    return this._defs[id];
  }

  getNested<T, I, M>(model: Model<T, I, M>, name?: string): ?State<T, I> {
    if(process.env.NODE_ENV !== "production") {
      ensureModel(this, model);
    }

    const inst = this._nested[name || model.name];

    if(inst) {
      debugAssert(inst._name === (name || model.name),
        `State name '${inst._name}' does not match key name '${name || model.name}`);
    }

    return inst;
  }

  getNestedOrCreate<U, J, N>(model: Model<U, J, N>, params: J, name?: string): State<U, J> {
    return getNestedOrCreate(this, model, params, name);
  }

  removeNested<U, J, N>(model: Model<U, J, N>, name?: string): void {
    const inst = this.getNested(model, name);

    if(inst) {
      delete this._nested[name || inst._name];

      this.emit("stateRemoved", inst.getPath(), inst._data);
    }
  }

  sendMessage(message: Message, sourceName?: string = ANONYMOUS_SOURCE): void {
    processStorageMessage(this, createInflightMessage(this, [sourceName], message));
  }

  addSubscriber<M: Message>(listener: Sink<M>, subscriptions: Subscriptions<M>): void {
    this._subscribers.push({ listener, subscriptions });
  }

  removeSubscriber(listener: Sink<any>): void {
    const { _subscribers } = this;

    for(let i = 0; i < _subscribers.length; i++) {
      if(_subscribers[i].listener === listener) {
        _subscribers.splice(i, 1);

        return;
      }
    }
  }

  getSnapshot(): Snapshot {
    return createSnapshot(this);
  }

  replyMessage(msg: Message, targetState: StatePath, sourceName?: string = REPLY_SOURCE): void {
    const instance = findClosestSupervisor(this, targetState);
    const inflight = [createInflightMessage(this, targetState.concat(sourceName), msg)];

    processInstanceMessages(this, instance, inflight);
  }

  restoreSnapshot(snapshot: Snapshot): void {
    this.emit("snapshotRestore", snapshot);

    restoreSnapshot(this, this, snapshot);

    this.emit("snapshotRestored");
  }
}

export function restoreSnapshot(
  storage: Storage,
  supervisor: Supervisor,
  snapshot: Snapshot
): void {
  const newNested: StateMap = {};

  /* eslint-disable guard-for-in */
  // We trust that the user has not been poking around in globals
  for(const k in snapshot) {
  /* eslint-enable guard-for-in */
    const { id, data, params, nested } = snapshot[k];

    // Ensure the model exists when we restore
    getModelById(storage, id);

    const inst = new State(id, supervisor, params, data, k);

    restoreSnapshot(storage, inst, nested);

    newNested[k] = inst;
  }

  supervisor._nested = newNested;
}

export function ensureModel<T, I, M>(storage: Storage, model: Model<T, I, M>): void {
  const { name: id } = model;

  if(storage._defs[id] && storage._defs[id] !== model) {
    // FIXME: Proper exception type
    throw new Error(`Model mismatch for '${id}'.`);
  }
}

export function getModelById<T, I, M: Message>(
  storage: Storage,
  id: string
): Model<T, I, M> {
  const spec = storage._defs[id];

  if( ! spec) {
    // TODO: Error type
    throw new Error(`Missing model for state '${id}'.`);
  }

  return spec;
}

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
  _params: I;
  _supervisor: Supervisor;
  _nested: StateMap = {};

  constructor(id: string, supervisor: Supervisor, params: I, data: T, name: string): void {
    super();

    this._id = id;
    this._name = name;
    this._supervisor = supervisor;
    this._params = params;
    this._data = data;
  }

  getName(): string {
    return this._name;
  }

  getData(): T {
    return this._data;
  }

  getStorage(): Storage {
    let s = this._supervisor;

    while(s instanceof State) {
      s = s._supervisor;
    }

    return s;
  }

  getPath(): StatePath {
    const path = [];
    let s = this;

    while(s instanceof State) {
      path.unshift(s._name);

      s = s._supervisor;
    }

    return path;
  }

  getNested<U, J, N>(model: Model<U, J, N>, name?: string): ?State<U, J> {
    if(process.env.NODE_ENV !== "production") {
      ensureModel(this.getStorage(), model);
    }

    const inst = this._nested[name || model.name];

    if(inst) {
      debugAssert(inst._name === (name || model.name),
        `State name '${inst._name}' does not match key name '${name || model.name}`);
    }

    return inst;
  }

  getNestedOrCreate<U, J, N>(model: Model<U, J, N>, params: J, name?: string): State<U, J> {
    return getNestedOrCreate(this, model, params, name);
  }

  removeNested<U, J, N>(model: Model<U, J, N>, name?: string): void {
    const inst = this.getNested(model, name);

    if(inst) {
      delete this._nested[name || inst._name];

      this.getStorage().emit("stateRemoved", inst.getPath(), inst._data);
    }
  }

  sendMessage(message: Message, sourceName?: string = ANONYMOUS_SOURCE): void {
    const storage = this.getStorage();
    const msgPath = this.getPath().concat([sourceName]);

    processInstanceMessages(storage, this, [createInflightMessage(storage, msgPath, message)]);
  }
}

export function getNestedOrCreate<T, I, M>(
  supervisor: Supervisor,
  model: Model<T, I, M>,
  params: I,
  name?: string
): State<T, I> {
  const child = supervisor.getNested(model, name);

  if(child) {
    // TODO: Diff and send message if the params are different

    return child;
  }

  return createState(supervisor, model, params, name);
}

export function createState<T, I, M>(
  supervisor: Supervisor,
  model: Model<T, I, M>,
  initialData: I,
  name?: string
): State<T, I> {
  const storage = supervisor.getStorage();
  const { name: id, init } = model;

  if( ! name) {
    name = id;
  }

  storage.tryRegisterModel(model);

  const update = init(initialData);
  const data = updateStateDataNoNone(update);
  const messages = updateOutgoingMessages(update);
  const instance = new State(id, supervisor, initialData, data, name);
  const path = instance.getPath();

  supervisor._nested[name] = instance;

  storage.emit("stateCreated", path, (initialData: any), data);

  if(messages.length > 0) {
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
    _received: null,
  };
}

export function findClosestSupervisor(supervisor: Supervisor, path: StatePath): Supervisor {
  for(let i = 0; i < path.length; i++) {
    if( ! supervisor._nested[path[i]]) {
      return supervisor;
    }

    supervisor = supervisor._nested[path[i]];
  }

  return supervisor;
}

export function enqueueMessages(
  storage: Storage,
  source: StatePath,
  inflight: Array<InflightMessage>,
  messages: Array<Message>
): void {
  for(let i = 0; i < messages.length; i++) {
    inflight.push(createInflightMessage(storage, source, messages[i]));
  }
}

export function processInstanceMessages(
  storage: Storage,
  instance: Supervisor,
  inflight: Array<InflightMessage>
): void {
  let sourcePath = instance.getPath();

  while(instance instanceof State) {
    const definition = getModelById(storage, instance._id);

    // We are going to add to messages if any new messages are generated, save
    // length here
    const currentLimit = inflight.length;
    const { update, subscribe } = definition;

    // We need to be able to update the filters if the data changes
    let messageFilter = subscribe(instance._data);

    // TODO: Emit event? that we are considering messags for state?

    for(let i = 0; i < currentLimit; i++) {
      const currentInflight = inflight[i];
      const { _message: m } = currentInflight;
      const match = findMatchingSubscription(messageFilter, m, Boolean(currentInflight._received));

      if(match) {
        if( ! match.isPassive) {
          currentInflight._received = sourcePath;
        }

        storage.emit("messageMatched", m, sourcePath, match.isPassive);

        const updateRequest = update(instance._data, m);

        if(updateHasData(updateRequest)) {
          const data = updateStateData(updateRequest);
          const outgoing = updateOutgoingMessages(updateRequest);

          instance._data = data;

          storage.emit("stateNewData", data, sourcePath, m);
          instance.emit("stateNewData", data, sourcePath, m);

          enqueueMessages(storage, sourcePath, inflight, outgoing);

          messageFilter = subscribe(instance._data);
        }
      }

      // No Match
    }

    // Traverse down one level
    sourcePath = sourcePath.slice(0, -1);
    instance = instance._supervisor;
  }

  for(let i = 0; i < inflight.length; i++) {
    processStorageMessage(storage, inflight[i]);
  }
}

function processStorageMessage(storage: Storage, inflight: InflightMessage): void {
  const { _subscribers: s } = storage;
  const { _message, _source } = inflight;
  let received = Boolean(inflight._received);

  for(let i = 0; i < s.length; i++) {
    const { listener, subscriptions } = s[i];
    const match = findMatchingSubscription(subscriptions, _message, Boolean(received));

    if(match) {
      if( ! match.isPassive) {
        received = true;
      }

      storage.emit("messageMatched", _message, [], match.isPassive);

      listener(_message, _source);
    }
  }

  if( ! received) {
    storage.emit("unhandledMessage", _message, _source);
  }
}

export function createStateSnapshot<T, I>(node: State<T, I>): StateSnapshot {
  return {
    id: node._id,
    // We assume it is immutably updated
    data: node._data,
    params: node._params,
    nested: createSnapshot(node),
  };
}

export function createSnapshot(node: Supervisor): Snapshot {
  return Object.keys(node._nested).reduce((a: Snapshot, key: string): Snapshot => {
    a[key] = createStateSnapshot(node._nested[key]);

    return a;
  }, {});
}
