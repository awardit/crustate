/* @flow */

import type { Update
            , DataUpdate
            , MessageUpdate } from "./update";
import type { InflightMessage
            , Message
            , MessageFilter
            , MessageTag } from "./message";
import type { Subscription } from "./message";

export type StatePath = Array<string>;

/**
 * Initialization function, called when the initial data is loaded into the state.
 */
export type Init<T, I> = (init: I) => DataUpdate<T> | MessageUpdate<T>;
/**
 * Receive function, receives messages for a state and produces a state-update
 * which can include messages sent to supervisors.
 */
export type Receive<T> = (state: T, msg: Message) => Update<T>;
/**
 * A list of subscriptions
 */
export type Subscriptions<T> = (state: T) => Array<Subscription>;

export type StateDefinition<T, I> = {
  init:          Init<T, I>,
  receive:       Receive<T>,
  subscriptions: Subscriptions<T>,
};

/**
 * Definition of a state containing the data `T` which can be instantiated given
 * the initial data `I`.
 */
export opaque type State<T, I> = {
  name:          string,
  init:          Init<T, I>,
  receive:       Receive<T>,
  subscriptions: Subscriptions<T>,
};

/**
 * Creates a new type of State, can then be used with Storage to create instances
 * of the state.
 *
 * @param {!string} name
 * @param {!StateDefinition} definition
 */
export function defineState<T, I>(name: string, definition: StateDefinition<T, I>): State<T, I> {
  return {
    name:          name,
    init:          definition.init,
    receive:       definition.receive,
    subscriptions: definition.subscriptions,
  };
}

/**
 * Internal
 */
export function stateName(state: State<any, any>): string {
  return state.name;
}
/**
 * Internal
 */
export function stateInit<T, I>(state: State<T, I>): Init<T, I> {
  return state.init;
}
/**
 * Internal
 */
export function stateReceive<T, I>(state: State<T, I>): Receive<T> {
  return state.receive;
}
/**
 * Internal
 */
export function stateSubscriptions<T, I>(state: State<T, I>): Subscriptions<T> {
  return state.subscriptions;
}