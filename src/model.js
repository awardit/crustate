/* @flow */

import type { Update, DataUpdate, MessageUpdate } from "./update";
import type { Subscriptions } from "./message";

/**
 * Initialization function, called when the initial data is loaded into the
 * state.
 */
export type ModelInit<T, I> = (init: I) => DataUpdate<T> | MessageUpdate<T>;
/**
 * Update function, receives messages for a state and produces a state-update
 * which can include messages sent to supervisors.
 */
export type ModelUpdate<T, M> = (state: T, msg: M) => Update<T>;
/**
 * A function returning a dictionary of subscriptions the state is interested
 * in.
 */
export type ModelSubscribe<T, M> = (state: T) => Subscriptions<M>;

/**
 * Definition of a state containing the data `T` which can be instantiated given
 * the initial data `I`.
 */
export type Model<T, I, M> = {
  name: string,
  init: ModelInit<T, I>,
  update: ModelUpdate<T, M>,
  subscribe: ModelSubscribe<T, M>,
};
