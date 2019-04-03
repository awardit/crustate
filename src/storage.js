/* @flow */

import type { State, StatePath } from "./state";
import type { InflightMessage
            , Message
            , Subscription } from "./message";
import type { StateInstance
            , StateInstanceMap } from "./instance";

import { EventEmitter } from "./events";
import { stateName } from "./state";
import { subscriptionIsPassive
       , subscriptionMatches } from "./message";

export type Sink = (message: Message, path: StatePath) => mixed;
export type Subscribers = Array<{ listener: Sink, filter: Array<Subscription> }>;

type StateDefs = { [key:string]: State<any, any> };

export const EVENT_UNHANDLED_MESSAGE = "unhandledMessage";

export type StorageEvents = {
  // FIXME: Events
  unhandledMessage: [Message, StatePath];
};

/**
 * Base node in a state-tree, anchors all states and carries all data.
 */
export class Storage extends EventEmitter<StorageEvents> {
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

  /**
   * Test
   */
  registerState<T, I>(state: State<T, I>) {
    if( ! this.ensureState(state)) {
      // FIXME: Proper exception type
      throw new Error(`Duplicate state name ${stateName(state)}`);
    }
  };

  /**
   * Loads the given state-definition for use, ensures that it is not a new
   * state with the same name if it is already loaded. `true` returned if it
   * was new, `false` otherwise.
   */
  ensureState<T, I>(state: State<T, I>): boolean {
    const name = stateName(state);

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

    return nested[stateName(state)];
  };

  sendMessage(message: Message): void {
    processMessage(this, {
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

export function processMessages(storage: Storage, messages: Array<InflightMessage>) {
  for(let i = 0; i < messages.length; i++) {
    processMessage(storage, messages[i]);
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
    storage.emit(EVENT_UNHANDLED_MESSAGE, message, source);
  }
}