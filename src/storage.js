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
import { EventEmitter } from "./events";

interface AbstractSupervisor {
  nested: StateInstanceMap;
  getStorage(): Storage;
  getNested<T, I>(state: State<T, I>): ?StateInstance<T, I>;
  getNestedOrCreate<U, J>(state: State<U, J>, params: J): StateInstance<U, J>;
  getPath(): StatePath;
}

export type Supervisor = (Storage | StateInstance<any, any>);

export type Sink = (message: Message, path: StatePath) => mixed;
export type Subscribers = Array<{ listener: Sink, filter: Array<Subscription> }>;

type StateDefs = { [key:string]: State<any, any> };

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
  messageQueued: [Message, StatePath, StateInstance<any, any>];
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
  defs: StateDefs   = {};

  constructor() {
    // TODO: Restore state
    super();
  }

  getStorage(): Storage {
    return this;
  }

  getPath(): StatePath {
    return [];
  }

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
  }

  sendMessage(message: Message): void {
    processStorageMessage(this, {
      message,
      source: [],
      received: null,
    });
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
}

export function processStorageMessages(storage: Storage, messages: Array<InflightMessage>) {
  for(let i = 0; i < messages.length; i++) {
    processStorageMessage(storage, messages[i]);
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

export type StateInstanceMap = { [name:string]: StateInstance<any, any> };

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
  }

  getData(): T {
    return this.data;
  }

  getPath(): StatePath {
    const path  = [];
    let   state = this;

    while(state instanceof StateInstance) {
      path.push(state.name);

      state = state.supervisor;
    }

    return path;
  }

  getNested<U, J>(state: State<U, J>): ?StateInstance<U, J> {
    const { nested } = this;

    if(process.env.NODE_ENV !== "production") {
      this.getStorage().ensureState(state);
    }

    return nested[state.name];
  };

  getNestedOrCreate<U, J>(state: State<U, J>, params: J): StateInstance<U, J> {
    return getNestedOrCreate(this, state, params);
  }

  getStorage(): Storage {
    let supervisor = this.supervisor;

    while(supervisor instanceof StateInstance) {
      supervisor = supervisor.supervisor;
    }

    return supervisor;
  }

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

// TODO: Drop state

export function enqueueMessages(storage: Storage, instance: StateInstance<any, any>, source: StatePath, target: StatePath, inflight: Array<InflightMessage>, messages: Array<Message>): void {
  for(let i = 0; i < messages.length; i++) {
    storage.emit("messageQueued", messages[i], target, instance);

    inflight.push({
      message:  messages[i],
      source,
      received: null,
    });
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

  processStorageMessages(storage, inflight);
}