/* @flow */

import type { State
            , StatePath } from "./state";
import type { InflightMessage
            , Message
            , Subscription } from "./message";

import { updateHasData
       , updateStateData
       , updateStateDataNoNone
       , updateOutgoingMessages } from "./update";
import { subscriptionIsPassive
       , subscriptionMatches } from "./message";
import { EventEmitter } from "./eventemitter";

interface AbstractSupervisor {
  _nested: StateInstanceMap;
  getStorage(): Storage;
  getPath(): StatePath;
  // TODO: Possibility to specify a name which does not match the state-name
  //       for the instance storage, would enable multiple instances on the
  //       same level
  getNested<T, I>(state: State<T, I>): ?StateInstance<T, I>;
  getNestedOrCreate<U, J>(state: State<U, J>, params: J): StateInstance<U, J>;
  // TODO: Implement
  // removeNested<T, I>(state: State<T, I>): void;
}

/**
 * A snapshot of the state of the application, can be used to restore the state
 * provided the requisite state-definitions have been loaded.
 */
export type Snapshot = { [instanceName:string]: StateSnapshot };
export type StateSnapshot = {
  // Name to use to find the state-definition when loading the snapshot
  defName: string,
  data:    mixed,
  params:  mixed,
  nested:  Snapshot,
};

/**
 * Supervisor is a parent state or a storage instance.
 *
 * NOTE: Essentially the same as AbstractSupervisor, just that this type is
 * closed to make it possible to differentiate between the two types while
 * traversing the tree.
 */
export type Supervisor = Storage | StateInstance<any, any>;

export type Sink = (message: Message, path: StatePath) => mixed;
export type Subscribers = Array<{ listener: Sink, filter: Array<Subscription> }>;

export type StateInstanceMap = { [name:string]: StateInstance<any, any> };

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
  stateCreated: [StatePath, mixed, mixed, StateInstance<any, any>],
  /**
   * Emitted when a state-instance updates its data.
   *
   * Parameters:
   *
   *  * The new data
   *  * Path to the new state
   *  * Message which caused the update
   */
  stateNewData: [mixed, StatePath, Message, StateInstance<any, any>],
  /**
   * Emitted when a message is queued for processing.
   *
   * Parameters:
   *
   *  * The message
   *  * Path of the origin, the closest state
   */
  messageQueued: [Message, StatePath, ?StateInstance<any, any>];
  /**
   * Emitted when a message is queued for processing.
   *
   * Parameters:
   *
   *  * The message
   *  * Path of the matching state-instance
   *  * If the subscription was passive
   */
  messageMatched: [Message, StatePath, boolean, StateInstance<any, any>];
};

/**
 * Base node in a state-tree, anchors all states and carries all data.
 */
export class Storage extends EventEmitter<StorageEvents> implements AbstractSupervisor {
  _subscribers: Subscribers = [];
  _nested: StateInstanceMap = {};
  /**
   * State-definitions, used for subscribers and messages.
   */
  _defs: { [key:string]: State<any, any> } = {};

  constructor(): void {
    // TODO: Restore state
    super();
  };

  getStorage(): Storage {
    return this;
  };

  getPath(): StatePath {
    return [];
  };

  /**
   * Test
   */
  registerState<T, I>(state: State<T, I>) {
    if( ! this.tryRegisterState(state)) {
      // FIXME: Proper exception type
      throw new Error(`Duplicate state name ${state.name}`);
    }
  };

  /**
   * Loads the given state-definition for use, ensures that it is not a new
   * state with the same name if it is already loaded. `true` returned if it
   * was new, `false` otherwise.
   */
  tryRegisterState<T, I>(state: State<T, I>): boolean {
    const { name } = state;

    if( ! this._defs[name]) {
      this._defs[name] = state;

      return true;
    }

    ensureState(this, state);

    return false;
  };

  stateDefinition<T, I>(instanceName: string): ?State<T, I> {
    return this._defs[instanceName];
  };

  getNested<T, I>(state: State<T, I>): ?StateInstance<T, I> {
    const { _nested } = this;

    if(_nested[state.name] && process.env.NODE_ENV !== "production") {
      ensureState(this, state);
    }

    return _nested[state.name];
  };

  getNestedOrCreate<U, J>(state: State<U, J>, params: J): StateInstance<U, J> {
    return getNestedOrCreate(this, state, params);
  };

  sendMessage(message: Message): void {
    processStorageMessage(this, createInflightMessage(this, null, [], [], message));
  };

  addSubscriber(listener: Sink, filter: Array<Subscription>) {
    this._subscribers.push({ listener, filter });
  };

  removeSubscriber(listener: Sink) {
    const { _subscribers } = this;

    for(let i = 0; i < _subscribers.length; i++) {
      if(_subscribers[i].listener === listener) {
        _subscribers.splice(i, 1);

        return;
      }
    }
  };

  getSnapshot(): Snapshot {
    return createSnapshot(this);
  }

  // TODO: restoreSnapshot(snapshot: Snapshot): void
}

export function ensureState<T, I>(storage: Storage, state: State<T, I>): void {
  const { name } = state;

  if(storage._defs[name] !== state) {
    // FIXME: Proper exception type
    throw new Error(`State object mismatch for state ${name}`);
  }
}

export type StateEvents = {
  /**
   * Emitted when a state-instance updates its data.
   *
   * Parameters:
   *
   *  * The new data
   *  * Path to the new state
   *  * Message which caused the update
   */
  stateNewData: [mixed, StatePath, Message, StateInstance<mixed, mixed>],
};

export class StateInstance<T, I> extends EventEmitter<StateEvents> implements AbstractSupervisor {
  /**
   * Matches the key used in the supervisor's `_nested` collection.
   */
  _name:       string;
  _data:       T;
  _params:     I;
  _supervisor: Supervisor;
  _nested:     StateInstanceMap = {};

  constructor(name: string, supervisor: Supervisor, params: I, data: T): void {
    super();

    this._name       = name;
    this._supervisor = supervisor;
    this._params     = params;
    this._data       = data;
  };

  getName(): string {
    return this._name;
  };

  getData(): T {
    return this._data;
  };

  getStorage(): Storage {
    let s = this._supervisor;

    while(s instanceof StateInstance) {
      s = s._supervisor;
    }

    return s;
  };

  getPath(): StatePath {
    const path = [];
    let   s    = this;

    while(s instanceof StateInstance) {
      path.push(s._name);

      s = s._supervisor;
    }

    return path;
  };

  getNested<U, J>(state: State<U, J>): ?StateInstance<U, J> {
    const { _nested } = this;

    if(_nested[state.name] && process.env.NODE_ENV !== "production") {
      ensureState(this.getStorage(), state);
    }

    return _nested[state.name];
  };

  getNestedOrCreate<U, J>(state: State<U, J>, params: J): StateInstance<U, J> {
    return getNestedOrCreate(this, state, params);
  };

  sendMessage(message: Message): void {
    processInstanceMessages(this, [message]);
  };
};

export function getNestedOrCreate<T, I>(supervisor: Supervisor, state: State<T, I>, params: I): StateInstance<T, I> {
  const child = supervisor.getNested(state);

  if(child) {
    // TODO: Diff and send message if the params are different

    return child;
  }

  return createState(supervisor, state, params);
}

export function createState<T, I>(supervisor: Supervisor, state: State<T, I>, initialData: I): StateInstance<T, I> {
  const { _nested }    = supervisor;
  const storage        = supervisor.getStorage();
  const { name, init } = state;

  storage.tryRegisterState(state);

  const update   = init(initialData);
  const data     = updateStateDataNoNone(update);
  const messages = updateOutgoingMessages(update);
  const instance = new StateInstance(name, supervisor, initialData, data);
  const path     = instance.getPath();

  _nested[name] = instance;

  storage.emit("stateCreated", path, (initialData: any), data, instance);

  if(messages.length) {
    processInstanceMessages(instance, messages);
  }

  return instance;
}

export function createInflightMessage(storage: Storage, instance: ?StateInstance<any, any>, source: StatePath, target: StatePath, message: Message): InflightMessage {
  storage.emit("messageQueued", message, target, (instance: ?StateInstance<any, any>));

  return {
    _message:  message,
    _source:   source,
    _received: null,
  };
}

export function enqueueMessages(storage: Storage, instance: StateInstance<any, any>, source: StatePath, target: StatePath, inflight: Array<InflightMessage>, messages: Array<Message>): void {
  for(let i = 0; i < messages.length; i++) {
    inflight.push(createInflightMessage(storage, instance, source, target, messages[i]));
  }
}

// TODO: Split this
export function processInstanceMessages(instance: StateInstance<any, any>, messages: Array<Message>): void {
  // TODO: Move this to common stuff
  // TODO: Merge thesw two
  // Make sure the current path is newly allocated when dropping the last segment to traverse upwards

  let currentPath = instance.getPath();
  let parentPath  = currentPath.slice(0, -1);
  const storage   = instance.getStorage();
  const inflight  = [];

  enqueueMessages(storage, instance, currentPath, currentPath, inflight, messages);

  let currentNode: Supervisor = instance;

  while(currentNode instanceof StateInstance) {
    const definition = storage.stateDefinition(currentNode._name);

    if( ! definition) {
      // TODO: Eror type
      throw new Error(`Missing state definition for instantiated state with name ${instance.getName()}`);
    }

    // We are going to add to messages if any new messages are generated, save
    // length here
    const currentLimit  = inflight.length;
    const { update, subscriptions } = definition;
    // We need to be able to update the filters if the data changes
    let   messageFilter = subscriptions(currentNode._data);

    // TODO: Emit event? that we are considering messags for state?

    for(let i = 0; i < currentLimit; i++) {
      const currentInflight = inflight[i];
      const { _message: m } = currentInflight;

      for(let j = 0; j < messageFilter.length; j++) {
        const currentFilter: Subscription = messageFilter[j];

        if(subscriptionMatches(currentFilter, m, Boolean(currentInflight._received))) {
          if( ! subscriptionIsPassive(currentFilter)) {
            currentInflight._received = currentPath;
          }

          storage.emit("messageMatched", m, currentPath, subscriptionIsPassive(currentFilter), currentNode);

          const updateRequest = update(currentNode._data, m);

          if(updateHasData(updateRequest)) {
            const data     = updateStateData(updateRequest);
            const outgoing = updateOutgoingMessages(updateRequest);

            currentNode._data = data;

            storage.emit("stateNewData", data, currentPath, m, currentNode)
            currentNode.emit("stateNewData", data, currentPath, m, currentNode)

            enqueueMessages(storage, currentNode, currentPath, parentPath, inflight, outgoing);

            messageFilter = subscriptions(currentNode._data);
          }
        }

        // No Match
      }
    }

    currentNode = currentNode._supervisor;
    currentPath = currentPath.slice(0, -1);
    parentPath  = parentPath.slice(0, -1);
  }

  for(let i = 0; i < inflight.length; i++) {
    processStorageMessage(storage, inflight[i]);
  }
}

function processStorageMessage(storage: Storage, inflight: InflightMessage) {
  const { _subscribers: s }   = storage;
  const { _message, _source } = inflight;
  let   received              = Boolean(inflight._received);

  for(let i = 0; i < s.length; i++) {
    const { listener, filter } = s[i];

    // TODO: Split
    for(let j = 0; j < filter.length; j++) {
      if(subscriptionMatches(filter[j], _message, Boolean(received))) {
        if( ! subscriptionIsPassive(filter[j])) {
          received = true;
        }

        listener(_message, _source);
      }
    }
  }

  if( ! received) {
    storage.emit("unhandledMessage", _message, _source);
  }
}

export function createStateSnapshot(node: StateInstance<any, any>): StateSnapshot {
  return {
    defName: node.getName(),
    // We assume it is immutably updated
    data:    node._data,
    params:  node._params,
    nested:  createSnapshot(node),
  };
}

export function createSnapshot(node: Supervisor): Snapshot {
  return Object.keys(node._nested).reduce((a, key) => {
    a[key] = createStateSnapshot(node._nested[key]);

    return a;
  }, {});
}