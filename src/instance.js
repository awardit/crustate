/* @flow */

import type { Root } from "./root";
import type { State
            , StatePath } from "./state";
import type { InflightMessage
            , Message
            , Subscription } from "./message";

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

export const EVENT_MESSAGE_QUEUED  = "messageQueued";
export const EVENT_MESSAGE_MATCHED = "messageMatched";
export const EVENT_STATE_NEW_DATA  = "stateNewData";

export type StateInstanceMap = { [name:string]: StateInstance<any, any> };

export type Supervisor = StateInstance<any, any> | Root;

export opaque type StateInstance<T, I> = {|
  name:       string,
  data:       T,
  supervisor: Supervisor,
  params:     I,
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

/* 
export function sendMessage(supervisor: Supervisor, message: Message): void {
  const path = instancePath(supervisor);

  setDirty(getRoot(supervisor), path);

  enqueue(supervisor, path, [message]);
}
*/

export function sendMessage(supervisor: Supervisor, message: Message): void {

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
    supervisor,
    params: initialData,
    nested: {},
  };
  const path = instancePath(instance);

  nested[name] = instance;

  // TODO: Should the root really be dirty for this? Technically yes? But with React?
  // setDirty(root, path);
  // TODO: Emit message instead

/* 
  if(messages.length > 0) {
    // enqueue(supervisor, path, messages);
  }
  */

  return instance;
}

export function processMessages(/* root: Root, */instance: StateInstance<any, any>, messages: Array<Message>) {
  // TODO: Move this to common stuff
  // TODO: Merge thesw two
  // Make sure the current path is newly allocated when dropping the last segment to traverse upwards
  let currentPath: Array<string>          = instancePath(instance);
  const root: Root                        = getRoot(instance);
  const inflight: Array<InflightMessage> = messages.map(m => {
    // TODO: Emit messages for the enqueued messages
    // root.emit(EVENT_MESSAGE_QUEUED, instance, currentPath, m)

    return {
      message:  m,
      source:   currentPath,
      received: null,
    };
  });

  while(true) {
    // We are going to add to messages if any new messages are generated
    const definition = stateDefinition(root, instance);

    if( ! definition) {
      // TODO: Eror type
      throw new Error(`Missing state definition for instantiated state with name ${instanceName(instance)}`);
    }

    const currentLimit  = inflight.length;
    const receive       = stateReceive(definition);
    const subscriptions = stateSubscriptions(definition);
    let   messageFilter = subscriptions(instance.data);

    // TODO: Emit event?

    for(let i = 0; i < currentLimit; i++) {
      const currentInflight = inflight[i];
      const { message }     = currentInflight;

      for(let j = 0; j < messageFilter.length; j++) {
        const currentFilter: Subscription = messageFilter[j];

        if(subscriptionMatches(currentFilter, currentInflight.message, Boolean(currentInflight.received))) {
          if( ! subscriptionIsPassive(currentFilter)) {
            currentInflight.received = currentPath;
          }

          // FIXME: Implement when we have an event emitter
          // root.emit(EVENT_MESSAGE_MATCHED, instance, currentPath, currentInflight.message, currentFilter.passive);

          const update   = receive(instance.data, currentInflight.message);

          if(updateHasData(update)) {
            const data     = updateStateData(update);
            const outgoing = updateOutgoingMessages(update);

            instance.data = data;

            // root.emit(EVENT_STATE_NEW_DATA, instance, currentPath, currentInflight.message, )

            for(let k = 0; k < outgoing.length; k++) {
              // root.emit(EVENT_MESSAGE_QUEUED, instance, parentPath, outgoing[k])
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
  }

  // TODO: Handle root
}