/* @flow */

import type { State, StatePath } from "./state";
import type { InflightMessage
            , Message
            , Subscription } from "./message";
import type { StateInstance
            , StateInstanceMap } from "./instance";
import type { EventEmitter } from "./events";

import { stateName } from "./state";
import { subscriptionIsPassive
       , subscriptionMatches } from "./message";
import { emit } from "./events";

export type Sink = (message: Message, path: StatePath) => mixed;
export type Subscribers = Array<{ listener: Sink, filter: Array<Subscription> }>;

export const EVENT_UNHANDLED_MESSAGE = "unhandledMessage";

// TODO: External message observers, kinda like event listeners in that they
//       provide a list of subscriptions
export type Root = {|
  // This spread trick is used to preserve exact object
  ...$Exact<EventEmitter>,
  subscribers: Subscribers,
  nested: StateInstanceMap;
  /**
   * State-definitions, used for subscribers and messages.
   */
  defs:   { [key:string]: State<any, any> };
|};

export function createRoot(): Root {
  return {
    nested:      {},
    defs:        {},
    subscribers: [],
    listeners:   {},
  };
}

export function registerState<T, I>(root: Root, state: State<T, I>) {
  if( ! ensureState(root, state)) {
    // FIXME: Proper exception type
    throw new Error(`Duplicate state name ${stateName(state)}`);
  }
}

/**
  * Loads the given state-definition for use, ensures that it is not a new
  * state with the same name if it is already loaded. `true` returned if it
  * was new, `false` otherwise.
  */
export function ensureState<T, I>(root: Root, state: State<T, I>): boolean {
  const name = stateName(state);

  if( ! root.defs[name]) {
    root.defs[name] = state;

    return true;
  }

  if(root.defs[name] !== state) {
    // FIXME: Proper exception type
    throw new Error(`State object mismatch for state ${name}`);
  }

  return false;
}

export function stateDefinition<T, I>(root: Root, instanceName: string): ?State<T, I> {
  return root.defs[instanceName];
}

export function addSubscriber(root: Root, listener: Sink, filter: Array<Subscription>) {
  root.subscribers.push({ listener, filter });
}

export function removeSubscriber(root: Root, listener: Sink) {
  const { subscribers } = root;

  for(let i = 0; i < subscribers.length; i++) {
    if(subscribers[i].listener === listener) {
      subscribers.splice(i, 1);

      return;
    }
  }
}

function processMessage(root: Root, inflight: InflightMessage) {
  const { subscribers }     = root;
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
    emit(root, EVENT_UNHANDLED_MESSAGE, message, source);
  }
}

export function processMessages(root: Root, messages: Array<InflightMessage>) {
  for(let i = 0; i < messages.length; i++) {
    processMessage(root, messages[i]);
  }
}