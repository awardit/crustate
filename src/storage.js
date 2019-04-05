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
  nested: StateInstanceMap;
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
  subscribers: Subscribers = [];
  nested: StateInstanceMap = {};
  /**
   * State-definitions, used for subscribers and messages.
   */
  defs: { [key:string]: State<any, any> } = {};

  constructor() {
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
    if( ! this.ensureState(state)) {
      // FIXME: Proper exception type
      throw new Error(`Duplicate state name ${state.name}`);
    }
  };

  /**
   * Loads the given state-definition for use, ensures that it is not a new
   * state with the same name if it is already loaded. `true` returned if it
   * was new, `false` otherwise.
   */
  ensureState<T, I>(state: State<T, I>): boolean {
    const { name } = state;

    if( ! this.defs[name]) {
      this.defs[name] = state;

      return true;
    }

    if(this.defs[name] !== state) {
      // FIXME: Proper exception type
      throw new Error(`State object mismatch for state ${name}`);
    }

    return false;
  };

  stateDefinition<T, I>(instanceName: string): ?State<T, I> {
    return this.defs[instanceName];
  };

  getNested<T, I>(state: State<T, I>): ?StateInstance<T, I> {
    const { nested } = this;

    if(process.env.NODE_ENV !== "production") {
      this.ensureState(state);
    }

    return nested[state.name];
  };

  getNestedOrCreate<U, J>(state: State<U, J>, params: J): StateInstance<U, J> {
    return getNestedOrCreate(this, state, params);
  };

  sendMessage(message: Message): void {
    processStorageMessage(this, createInflightMessage(this, null, [], [], message));
  };

  addSubscriber(listener: Sink, filter: Array<Subscription>) {
    this.subscribers.push({ listener, filter });
  };

  removeSubscriber(listener: Sink) {
    const { subscribers } = this;

    for(let i = 0; i < subscribers.length; i++) {
      if(subscribers[i].listener === listener) {
        subscribers.splice(i, 1);

        return;
      }
    }
  };

  getSnapshot(): Snapshot {
    return createSnapshot(this);
  }

  // TODO: restoreSnapshot(snapshot: Snapshot): void
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
   * Matches the key used in the supervisor's `nested` collection.
   */
  name:       string;
  data:       T;
  params:     I;
  supervisor: Supervisor;
  nested:     StateInstanceMap = {};

  constructor(name: string, supervisor: Supervisor, params: I, data: T) {
    super();

    this.name       = name;
    this.supervisor = supervisor;
    this.params     = params;
    this.data       = data;
  };

  getName(): string {
    return this.name;
  };

  getData(): T {
    return this.data;
  };

  getStorage(): Storage {
    let supervisor = this.supervisor;

    while(supervisor instanceof StateInstance) {
      supervisor = supervisor.supervisor;
    }

    return supervisor;
  };

  getPath(): StatePath {
    const path  = [];
    let   state = this;

    while(state instanceof StateInstance) {
      path.push(state.name);

      state = state.supervisor;
    }

    return path;
  };

  getNested<U, J>(state: State<U, J>): ?StateInstance<U, J> {
    const { nested } = this;

    if(process.env.NODE_ENV !== "production") {
      this.getStorage().ensureState(state);
    }

    return nested[state.name];
  };

  getNestedOrCreate<U, J>(state: State<U, J>, params: J): StateInstance<U, J> {
    return getNestedOrCreate(this, state, params);
  };

  sendMessage(message: Message): void {
    processInstanceMessages(this, [message]);
  };
};

export function getNestedOrCreate<T, I>(supervisor: Supervisor, state: State<T, I>, params: I): StateInstance<T, I> {
  const nested = supervisor.getNested(state);

  if(nested) {
    // TODO: Diff and send message if the params are different

    return nested;
  }

  return createState(supervisor, state, params);
}

export function createState<T, I>(supervisor: Supervisor, state: State<T, I>, initialData: I): StateInstance<T, I> {
  const { nested }     = supervisor;
  const storage        = supervisor.getStorage();
  const { name, init } = state;

  storage.ensureState(state);

  const update   = init(initialData);
  const data     = updateStateDataNoNone(update);
  const messages = updateOutgoingMessages(update);
  const instance = new StateInstance<T, I>(name, supervisor, initialData, data);
  const path     = instance.getPath();

  nested[name] = instance;

  storage.emit("stateCreated", path, (initialData: any), data, instance);

  if(messages.length) {
    processInstanceMessages(instance, messages);
  }

  return instance;
}

export function createInflightMessage(storage: Storage, instance: ?StateInstance<any, any>, source: StatePath, target: StatePath, message: Message) {
  storage.emit("messageQueued", message, target, (instance: ?StateInstance<any, any>));

  return {
    message: message,
    source,
    received: null,
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

  let supervisor: Supervisor = instance;

  while(supervisor instanceof StateInstance) {
    const definition = storage.stateDefinition(supervisor.name);

    if( ! definition) {
      // TODO: Eror type
      throw new Error(`Missing state definition for instantiated state with name ${instance.getName()}`);
    }

    // We are going to add to messages if any new messages are generated, save
    // length here
    const currentLimit  = inflight.length;
    const { update, subscriptions } = definition;
    // We need to be able to update the filters if the data changes
    let   messageFilter = subscriptions(supervisor.data);

    // TODO: Emit event? that we are considering messags for state?

    for(let i = 0; i < currentLimit; i++) {
      const currentInflight = inflight[i];
      const { message }     = currentInflight;

      for(let j = 0; j < messageFilter.length; j++) {
        const currentFilter: Subscription = messageFilter[j];

        if(subscriptionMatches(currentFilter, message, Boolean(currentInflight.received))) {
          if( ! subscriptionIsPassive(currentFilter)) {
            currentInflight.received = currentPath;
          }

          storage.emit("messageMatched", message, currentPath, subscriptionIsPassive(currentFilter), supervisor);

          const updateRequest = update(supervisor.data, message);

          if(updateHasData(updateRequest)) {
            const data     = updateStateData(updateRequest);
            const outgoing = updateOutgoingMessages(updateRequest);

            supervisor.data = data;

            storage.emit("stateNewData", data, currentPath, message, supervisor)
            supervisor.emit("stateNewData", data, currentPath, message, supervisor)

            enqueueMessages(storage, supervisor, currentPath, parentPath, inflight, outgoing);

            messageFilter = subscriptions(supervisor.data);
          }
        }

        // No Match
      }
    }

    supervisor  = supervisor.supervisor;
    currentPath = currentPath.slice(0, -1);
    parentPath  = parentPath.slice(0, -1);
  }

  for(let i = 0; i < inflight.length; i++) {
    processStorageMessage(storage, inflight[i]);
  }
}

function processStorageMessage(storage: Storage, inflight: InflightMessage) {
  const { subscribers }     = storage;
  const { message, source } = inflight;
  let   received            = Boolean(inflight.received);

  for(let i = 0; i < subscribers.length; i++) {
    const { listener, filter } = subscribers[i];

    // TODO: Split
    for(let j = 0; j < filter.length; j++) {
      if(subscriptionMatches(filter[j], message, Boolean(received))) {
        if( ! subscriptionIsPassive(filter[j])) {
          received = true;
        }

        listener(message, source);
      }
    }
  }

  if( ! received) {
    storage.emit("unhandledMessage", message, source);
  }
}

export function createStateSnapshot(node: StateInstance<any, any>): StateSnapshot {
  return {
    defName: node.getName(),
    // We assume it is immutably updated
    data:    node.data,
    params:  node.params,
    nested:  createSnapshot(node),
  };
}

export function createSnapshot(node: Supervisor): Snapshot {
  return Object.keys(node.nested).reduce((a, key) => {
    a[key] = createStateSnapshot(node.nested[key]);

    return a;
  }, {});
}