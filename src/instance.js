/* @flow */

import type { Root } from "./root";
import type { State
            , StatePath } from "./state";
import type { InflightMessage
            , Message
            , Subscription } from "./message";
import type { EventEmitter } from "./events";

import { ensureState
       , stateDefinition } from "./root";
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

export const EVENT_NEW_STATE_INSTANCE = "newStateInstance";
export const EVENT_MESSAGE_QUEUED     = "messageQueued";
export const EVENT_MESSAGE_MATCHED    = "messageMatched";
export const EVENT_STATE_NEW_DATA     = "stateNewData";

export type StateInstanceMap = { [name:string]: StateInstance<any, any> };

export type Supervisor = StateInstance<any, any> | Root;

export opaque type StateInstance<T, I> = {|
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
  const root       = getRoot(supervisor);

  ensureState(root, state);

  return nested[stateName(state)];
}

export function newState<T, I>(supervisor: Supervisor, state: State<T, I>, initialData: I): StateInstance<T, I> {
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

  emit(root, EVENT_NEW_STATE_INSTANCE, path, data, initialData, instance);

  if(messages.length) {
    processMessages(instance, messages);
  }

  return instance;
}

export function sendMessage(instance: StateInstance<any, any>, message: Message): void {
  processMessages(instance, [message]);
}

export function processMessages(instance: StateInstance<any, any>, messages: Array<Message>): void {
  // TODO: Move this to common stuff
  // TODO: Merge thesw two
  // Make sure the current path is newly allocated when dropping the last segment to traverse upwards
  let currentPath: Array<string>         = instancePath(instance);
  let parentPath: Array<string>          = currentPath.slice(0, -1);
  const root: Root                       = getRoot(instance);
  // TODO: Move this to a separate function to be able to reuse?
  const inflight: Array<InflightMessage> = messages.map(m => {
    emit(root, EVENT_MESSAGE_QUEUED, m, currentPath, instance);

    return {
      message:  m,
      source:   currentPath,
      received: null,
    };
  });

  while(true) {
    const definition = stateDefinition(root, instance);

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

          const update   = receive(instance.data, message);

          if(updateHasData(update)) {
            const data     = updateStateData(update);
            const outgoing = updateOutgoingMessages(update);

            instance.data = data;

            emit(root, EVENT_STATE_NEW_DATA, data, currentPath, message, instance)
            emit(instance, EVENT_STATE_NEW_DATA, data, currentPath, message, instance)

            for(let k = 0; k < outgoing.length; k++) {
              emit(root, EVENT_MESSAGE_QUEUED, outgoing[k], parentPath, instance);

              inflight.push({
                message:  outgoing[k],
                source:   currentPath,
                received: null,
              })
            }

            messageFilter = subscriptions(instance.data);
          }
        }

        // No Match
      }
    }
    
    const i: Supervisor = instance.supervisor;

    if( ! i.supervisor) {
      break;
    }

    instance    = i;
    currentPath = currentPath.slice(0, -1);
    parentPath  = parentPath.slice(0, -1);
  }

  // TODO: Handle root and subscribers at that level
}