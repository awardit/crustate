/* @flow */

import type { Message } from "./message";

/**
 * Update containing new state-data if any, and any messages to send to
 * supervisors.
 */
export type Update<T> = {| data: T, messages: ?Array<Message> |};

export type UpdateNoop = 1;

/**
 * Initialization function, called when the initial data is loaded into the
 * state.
 */
export type ModelInit<T, I> = (init: I) => Update<T>;

/**
 * Message representing any other kind of message in the type-signature of
 * `ModelUpdate`, do not match against this message directly.
 *
 * This type exists to ensure users refine the message-type before acting
 * on incoming messages.
 */
export type UnknownMessage = {
  +tag: "!DO!NOT!MATCH!THIS!",
};

/**
 * Update function, receives messages for a state and produces a state-update
 * which can include messages sent to supervisors.
 *
 * The incoming messages can be any random message, refine on `tag` to ensure
 * the messages are indended for the state before acting upon them.
 */
export type ModelUpdate<T, M> = (state: T, msg: M | UnknownMessage) => ?Update<T> | UpdateNoop;

/**
 * Definition of a state containing the data `T` which can be instantiated given
 * the initial data `I`.
 */
export type Model<T, I, M> = {
  id: string,
  init: ModelInit<T, I>,
  update: ModelUpdate<T, M>,
};

/**
 * Utility type resolving the data-type of a model with unspecified
 * type-parameters.
 */
export type TypeofModelData<+M: Model<any, any, any>> =
  $Call<<T, N: Model<T, any, any>>(N) => T, M>;

/**
 * Utility type resolving the init-type of a model with unspecified
 * type-parameters.
 */
export type TypeofModelInit<+M: Model<any, any, any>> =
  $Call<<T, N: Model<any, T, any>>(N) => T, M>;

export function updateNone(): UpdateNoop {
  return 1;
}

/**
 * Creates an update replacing the data of the state.
 */
export function updateData<T>(data: T): Update<T> {
  return { data, messages: null };
}

/**
 * Creates an update replacing the data of the state, and sends a list o
 * messages to supervisoring states.
 */
export function updateAndSend<T>(data: T, ...messages: Array<Message>): Update<T> {
  return { data, messages };
}
