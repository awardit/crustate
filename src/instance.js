/* @flow */

import type { Root } from "./root";
import type { State
            , StatePath } from "./state";
import type { InflightMessage
            , Message
            , Subscription } from "./message";
import type { EventEmitter } from "./events";

import { ensureState
       , stateDefinition
       , processMessages as rootProcessMessages } from "./root";
import { updateHasData
       , updateStateData
       , updateStateDataNoNone
       , updateOutgoingMessages } from "./update";
import { subscriptionIsPassive
       , subscriptionMatches } from "./message";
import { stateName
       , stateInit
       , stateReceive
       , stateSubscriptions } from "./state";
import { emit } from "./events";

export const EVENT_STATE_CREATED   = "stateCreated";
export const EVENT_STATE_NEW_DATA  = "stateNewData";
export const EVENT_MESSAGE_QUEUED  = "messageQueued";
export const EVENT_MESSAGE_MATCHED = "messageMatched";

export type StateInstanceMap = { [name:string]: StateInstance<any, any> };

export type Supervisor = StateInstance<any, any> | Root;

export opaque type StateInstance<T, I>: EventEmitter = {|
  ...$Exact<EventEmitter>,
  name:       string,
  data:       T,
  params:     I,
  supervisor: Supervisor,
  nested:     StateInstanceMap,
|};

export function instancePath(state: Supervisor): StatePath {
  const path = [];

  while(state.supervisor) {
    path.push(state.name);

    state = state.supervisor;
  }

  return path;
}

export function instanceName(instance: StateInstance<any, any>): string {
  return instance.name;
}

export function getRoot(supervisor: Supervisor): Root {
  while(supervisor.supervisor) {
    supervisor = supervisor.supervisor;
  }

  return supervisor;
}

export function getNestedInstance<T, I>(supervisor: Supervisor, state: State<T, I>): ?StateInstance<T, I> {
  const { nested } = supervisor;

  if(process.env.NODE_ENV !== "production") {
    ensureState(getRoot(supervisor), state);
  }

  return nested[stateName(state)];
}

export function createState<T, I>(supervisor: Supervisor, state: State<T, I>, initialData: I): StateInstance<T, I> {
  const { nested } = supervisor;
  const root       = getRoot(supervisor);
  const name       = stateName(state);
  const init       = stateInit(state);

  ensureState(root, state);

  const update   = init(initialData);
  const data     = updateStateDataNoNone(update);
  const messages = updateOutgoingMessages(update);
  const instance: StateInstance<T, I> = {
    name,
    data,
    params: initialData,
    supervisor,
    listeners: {},
    nested: {},
  };
  const path = instancePath(instance);

  nested[name] = instance;

  emit(root, EVENT_STATE_CREATED, path, data, initialData, instance);

  if(messages.length) {
    processMessages(instance, messages);
  }

  return instance;
}

export function stateData<T>(state: StateInstance<T, any>): T {
  return state.data;
}

// TODO: Drop state

export function sendMessage(instance: Supervisor, message: Message): void {
  processMessages(instance, [message]);
}

export function enqueueMessages(root: Root, instance: StateInstance<any, any>, source: StatePath, target: StatePath, inflight: Array<InflightMessage>, messages: Array<Message>): void {
  for(let i = 0; i < messages.length; i++) {
    emit(root, EVENT_MESSAGE_QUEUED, messages[i], target, instance);

    inflight.push({
      message:  messages[i],
      source,
      received: null,
    });
  }
}

// TODO: Split this
export function processMessages(instance: Supervisor, messages: Array<Message>): void {
  // TODO: Move this to common stuff
  // TODO: Merge thesw two
  // Make sure the current path is newly allocated when dropping the last segment to traverse upwards
  let currentPath = instancePath(instance);
  let parentPath  = currentPath.slice(0, -1);
  const root      = getRoot(instance);
  const inflight  = [];

  enqueueMessages(root, instance, currentPath, currentPath, inflight, messages);

  while(instance.supervisor) {
    const definition = stateDefinition(root, instance.name);

    if( ! definition) {
      // TODO: Eror type
      throw new Error(`Missing state definition for instantiated state with name ${instanceName(instance)}`);
    }

    // We are going to add to messages if any new messages are generated, save
    // length here
    const currentLimit  = inflight.length;
    const receive       = stateReceive(definition);
    const subscriptions = stateSubscriptions(definition);
    // We need to be able to update the filters if the data changes
    let   messageFilter = subscriptions(instance.data);

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

          emit(root, EVENT_MESSAGE_MATCHED, message, currentPath, subscriptionIsPassive(currentFilter), instance);

          const update = receive(instance.data, message);

          if(updateHasData(update)) {
            const data     = updateStateData(update);
            const outgoing = updateOutgoingMessages(update);

            instance.data = data;

            emit(root, EVENT_STATE_NEW_DATA, data, currentPath, message, instance)
            emit(instance, EVENT_STATE_NEW_DATA, data, currentPath, message, instance)
            enqueueMessages(root, instance, currentPath, parentPath, inflight, outgoing);

            messageFilter = subscriptions(instance.data);
          }
        }

        // No Match
      }
    }
    
    instance    = instance.supervisor;
    currentPath = currentPath.slice(0, -1);
    parentPath  = parentPath.slice(0, -1);
  }
  
  rootProcessMessages(root, inflight);
}