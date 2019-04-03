/* @flow */

import type { State
            , StatePath } from "./state";
import type { InflightMessage
            , Message
            , Subscription } from "./message";
import type { Supervisor
            , SupervisorCommon } from "./supervisor";

import { Storage } from "./storage";
import { processMessages as storageProcessMessages } from "./storage";
import { updateHasData
       , updateStateData
       , updateStateDataNoNone
       , updateOutgoingMessages } from "./update";
import { subscriptionIsPassive
       , subscriptionMatches } from "./message";
import { EventEmitter } from "./events";

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

export class StateInstance<T, I> extends EventEmitter<StateEvents> implements SupervisorCommon {
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

  getStorage(): Storage {
    let supervisor = this.supervisor;

    while(supervisor instanceof StateInstance) {
      supervisor = supervisor.supervisor;
    }

    return supervisor;
  }

  sendMessage(message: Message): void {
    processMessages(this, [message]);
  };
};

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
    processMessages(instance, messages);
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
export function processMessages(instance: StateInstance<any, any>, messages: Array<Message>): void {
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

  storageProcessMessages(storage, inflight);
}