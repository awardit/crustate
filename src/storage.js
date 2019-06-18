/* @flow */

import type { State, StatePath } from "./state";
import type { InflightMessage, Message, SubscriptionMap } from "./message";

import { debugAssert } from "./assert";
import {
  updateHasData,
  updateStateData,
  updateStateDataNoNone,
  updateOutgoingMessages,
} from "./update";
import { findMatchingSubscription } from "./message";
import { EventEmitter } from "./eventemitter";

const ANONYMOUS_SOURCE = "$";
const REPLY_SOURCE = "<";

interface AbstractSupervisor {
  _nested: StateInstanceMap,
  getStorage(): Storage,
  getPath(): StatePath,
  getNested<T, I, M>(state: State<T, I, M>, name?: string): ?StateInstance<T, I>,
  getNestedOrCreate<T, I, M>(state: State<T, I, M>, params: I, name?: string): StateInstance<T, I>,
  sendMessage(message: Message, sourceName?: string): void,
  removeNested<T, I, M>(state: State<T, I, M>, name?: string): void,
}

/**
 * A snapshot of the state of the application, can be used to restore the state
 * provided the requisite state-definitions have been loaded.
 */
export type Snapshot = { [instanceName: string]: StateSnapshot };
export type StateSnapshot = {
  // Name to use to find the state-definition when loading the snapshot
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
export type Supervisor = Storage | StateInstance<any, any>;

export type Sink<M: Message> = (message: M, sourcePath: StatePath) => mixed;
export type Subscriber<M: Message> = { listener: Sink<M>, subscription: SubscriptionMap<M> };

export type StateInstanceMap = { [name: string]: StateInstance<any, any> };

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
   * Emitted when a state-instance is created.
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

/**
 * Base node in a state-tree, anchors all states and carries all data.
 */
export class Storage extends EventEmitter<StorageEvents> implements AbstractSupervisor {
  _subscribers: Array<Subscriber<any>> = [];
  _nested: StateInstanceMap = {};
  /**
   * State-definitions, used for subscribers and messages.
   */
  _defs: { [id: string]: State<any, any, any> } = {};

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
  registerState<T, I, M>(state: State<T, I, M>): void {
    if( ! this.tryRegisterState(state)) {
      // FIXME: Proper exception type
      throw new Error(`Duplicate state name ${state.name}`);
    }
  }

  /**
   * Loads the given state-definition for use, ensures that it is not a new
   * state with the same name if it is already loaded. `true` returned if it
   * was new, `false` otherwise.
   */
  tryRegisterState<T, I, M>(state: State<T, I, M>): boolean {
    const { name: id } = state;

    if( ! this._defs[id]) {
      this._defs[id] = state;

      return true;
    }

    ensureState(this, state);

    return false;
  }

  stateDefinition<T, I, M>(instanceId: string): ?State<T, I, M> {
    return this._defs[instanceId];
  }

  getNested<T, I, M>(state: State<T, I, M>, name?: string): ?StateInstance<T, I> {
    if(process.env.NODE_ENV !== "production") {
      ensureState(this, state);
    }

    const inst = this._nested[name || state.name];

    if(inst) {
      debugAssert(inst._name === (name || state.name), `State instance name '${inst._name}' does not match key name '${name || state.name}`);
    }

    return inst;
  }

  getNestedOrCreate<U, J, N>(state: State<U, J, N>, params: J, name?: string): StateInstance<U, J> {
    return getNestedOrCreate(this, state, params, name);
  }

  removeNested<U, J, N>(state: State<U, J, N>, name?: string): void {
    const inst = this.getNested(state, name);

    if(inst) {
      delete this._nested[name || inst._name];

      this.emit("stateRemoved", inst.getPath(), inst._data);
    }
  }

  sendMessage(message: Message, sourceName?: string = ANONYMOUS_SOURCE): void {
    processStorageMessage(this, createInflightMessage(this, [sourceName], message));
  }

  addSubscriber<M: Message>(listener: Sink<M>, subscription: SubscriptionMap<M>): void {
    this._subscribers.push({ listener, subscription });
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
    const inst = findSupervisor(this, targetState);

    if( ! inst) {
      throw new Error(`Could not find state instance at [${targetState.join(", ")}].`);
    }

    inst.sendMessage(msg, sourceName);
  }

  restoreSnapshot(snapshot: Snapshot): void {
    this.emit("snapshotRestore", snapshot);

    restoreSnapshot(this, this, snapshot);

    this.emit("snapshotRestored");
  }
}

export function restoreSnapshot(storage: Storage, supervisor: Supervisor, snapshot: Snapshot): void {
  const newNested: StateInstanceMap = {};

  /* eslint-disable guard-for-in */
  // We trust that the user has not been poking around in globals
  for(const k in snapshot) {
  /* eslint-enable guard-for-in */
    const { id, data, params, nested } = snapshot[k];

    // Ensure the state definition exists when we restore
    getStateDefinitionById(storage, id);

    const inst = new StateInstance(id, supervisor, params, data, k);

    restoreSnapshot(storage, inst, nested);

    newNested[k] = inst;
  }

  supervisor._nested = newNested;
}

export function ensureState<T, I, M>(storage: Storage, state: State<T, I, M>): void {
  const { name: id } = state;

  if(storage._defs[id] && storage._defs[id] !== state) {
    // FIXME: Proper exception type
    throw new Error(`State object mismatch for state ${id}`);
  }
}

export function getStateDefinitionById<T, I, M: Message>(storage: Storage, id: string): State<T, I, M> {
  const spec = storage._defs[id];

  if( ! spec) {
    // TODO: Error type
    throw new Error(`Missing state definition for state with name ${id}`);
  }

  return spec;
}

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

export class StateInstance<T, I> extends EventEmitter<StateEvents<T>> implements AbstractSupervisor {
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
  _nested: StateInstanceMap = {};

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

    while(s instanceof StateInstance) {
      s = s._supervisor;
    }

    return s;
  }

  getPath(): StatePath {
    const path = [];
    let s = this;

    while(s instanceof StateInstance) {
      path.unshift(s._name);

      s = s._supervisor;
    }

    return path;
  }

  getNested<U, J, N>(state: State<U, J, N>, name?: string): ?StateInstance<U, J> {
    if(process.env.NODE_ENV !== "production") {
      ensureState(this.getStorage(), state);
    }

    const inst = this._nested[name || state.name];

    if(inst) {
      debugAssert(inst._name === (name || state.name), `State instance name '${inst._name}' does not match key name '${name || state.name}`);
    }

    return inst;
  }

  getNestedOrCreate<U, J, N>(state: State<U, J, N>, params: J, name?: string): StateInstance<U, J> {
    return getNestedOrCreate(this, state, params, name);
  }

  removeNested<U, J, N>(state: State<U, J, N>, name?: string): void {
    const inst = this.getNested(state, name);

    if(inst) {
      delete this._nested[name || inst._name];

      this.getStorage().emit("stateRemoved", inst.getPath(), inst._data);
    }
  }

  sendMessage(message: Message, sourceName?: string = ANONYMOUS_SOURCE): void {
    const msgPath = this.getPath().concat([sourceName]);

    processInstanceMessages(this.getStorage(), this, [message], msgPath);
  }
}

export function getNestedOrCreate<T, I, M>(supervisor: Supervisor, state: State<T, I, M>, params: I, name?: string): StateInstance<T, I> {
  const child = supervisor.getNested(state, name);

  if(child) {
    // TODO: Diff and send message if the params are different

    return child;
  }

  return createState(supervisor, state, params, name);
}

export function createState<T, I, M>(supervisor: Supervisor, state: State<T, I, M>, initialData: I, name?: string): StateInstance<T, I> {
  const storage = supervisor.getStorage();
  const { name: id, init } = state;

  if( ! name) {
    name = id;
  }

  storage.tryRegisterState(state);

  const update = init(initialData);
  const data = updateStateDataNoNone(update);
  const messages = updateOutgoingMessages(update);
  const instance = new StateInstance(id, supervisor, initialData, data, name);
  const path = instance.getPath();

  supervisor._nested[name] = instance;

  storage.emit("stateCreated", path, (initialData: any), data);

  if(messages.length > 0) {
    processInstanceMessages(storage, instance._supervisor, messages, path);
  }

  return instance;
}

export function createInflightMessage(storage: Storage, source: StatePath, message: Message): InflightMessage {
  storage.emit("messageQueued", message, source);

  return {
    _message: message,
    _source: source,
    _received: null,
  };
}

export function findSupervisor(supervisor: Supervisor, path: StatePath): ?Supervisor {
  for(let i = 0; i < path.length; i++) {
    supervisor = supervisor._nested[path[i]];

    if( ! supervisor) {
      return null;
    }
  }

  return supervisor;
}

export function enqueueMessages(storage: Storage, source: StatePath, inflight: Array<InflightMessage>, messages: Array<Message>): void {
  for(let i = 0; i < messages.length; i++) {
    inflight.push(createInflightMessage(storage, source, messages[i]));
  }
}

// TODO: Split this
export function processInstanceMessages(storage: Storage, instance: Supervisor, messages: Array<Message>, sourcePath: StatePath): void {
  const inflight = [];

  // TODO: Test-assertion for sourcePath.length === instance.getPath().length + 1 ?

  enqueueMessages(storage, sourcePath, inflight, messages);

  while(instance instanceof StateInstance) {
    const definition = getStateDefinitionById(storage, instance._id);

    // We are going to add to messages if any new messages are generated, save
    // length here
    const currentLimit = inflight.length;
    const { update, subscribe } = definition;

    // We need to be able to update the filters if the data changes
    let messageFilter = subscribe(instance._data);

    // Traverse down one level
    sourcePath = sourcePath.slice(0, -1);

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
    const { listener, subscription } = s[i];
    const match = findMatchingSubscription(subscription, _message, Boolean(received));

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

export function createStateSnapshot<T, I>(node: StateInstance<T, I>): StateSnapshot {
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