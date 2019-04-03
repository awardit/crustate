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

/**
 * Base node in a state-tree, anchors all states and carries all data.
 */
export type Storage = {|
  // This spread trick is used to preserve exact object
  ...$Exact<EventEmitter>,
  subscribers: Subscribers,
  nested: StateInstanceMap;
  /**
   * State-definitions, used for subscribers and messages.
   */
  defs:   { [key:string]: State<any, any> };
|};

export function createStorage(): Storage {
  return {
    nested:      {},
    defs:        {},
    subscribers: [],
    listeners:   {},
  };
}

export function registerState<T, I>(storage: Storage, state: State<T, I>) {
  if( ! ensureState(storage, state)) {
    // FIXME: Proper exception type
    throw new Error(`Duplicate state name ${stateName(state)}`);
  }
}

/**
  * Loads the given state-definition for use, ensures that it is not a new
  * state with the same name if it is already loaded. `true` returned if it
  * was new, `false` otherwise.
  */
export function ensureState<T, I>(storage: Storage, state: State<T, I>): boolean {
  const name = stateName(state);

  if( ! storage.defs[name]) {
    storage.defs[name] = state;

    return true;
  }

  if(storage.defs[name] !== state) {
    // FIXME: Proper exception type
    throw new Error(`State object mismatch for state ${name}`);
  }

  return false;
}

export function stateDefinition<T, I>(storage: Storage, instanceName: string): ?State<T, I> {
  return storage.defs[instanceName];
}

export function addSubscriber(storage: Storage, listener: Sink, filter: Array<Subscription>) {
  storage.subscribers.push({ listener, filter });
}

export function removeSubscriber(storage: Storage, listener: Sink) {
  const { subscribers } = storage;

  for(let i = 0; i < subscribers.length; i++) {
    if(subscribers[i].listener === listener) {
      subscribers.splice(i, 1);

      return;
    }
  }
}

function processMessage(storage: Storage, inflight: InflightMessage) {
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
    emit(storage, EVENT_UNHANDLED_MESSAGE, message, source);
  }
}

export function processMessages(storage: Storage, messages: Array<InflightMessage>) {
  for(let i = 0; i < messages.length; i++) {
    processMessage(storage, messages[i]);
  }
}