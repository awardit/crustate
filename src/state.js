/* @flow */

import type { Update
            , DataUpdate
            , MessageUpdate } from "./update";
import type { SubscriptionMap } from "./message";

export type StatePath = Array<string>;

/**
 * Initialization function, called when the initial data is loaded into the
 * state.
 */
export type Init<T, I> = (init: I) => DataUpdate<T> | MessageUpdate<T>;
/**
 * Update function, receives messages for a state and produces a state-update
 * which can include messages sent to supervisors.
 */
export type StateUpdate<T, M> = (state: T, msg: M) => Update<T>;
/**
 * A function returning a dictionary of subscriptions the state is interested
 * in.
 */
export type Subscribe<T, M> = (state: T) => SubscriptionMap<M>;

/**
 * Definition of a state containing the data `T` which can be instantiated given
 * the initial data `I`.
 */
export type State<T, I, M> = {
  name:      string,
  init:      Init<T, I>,
  update:    StateUpdate<T, M>,
  subscribe: Subscribe<T, M>,
};