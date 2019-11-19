/* @flow */

import type { StatePath } from "./storage";

/**
 * Tag identifying the message, used to match and refine messages.
 */
export type MessageTag = string;

/**
 * Messages are used to inform states of new events/data which are of interest,
 * these are passed to `StateUpdate` functions of matching states in the
 * state-hierarchy.
 *
 * Extra data can be assigned on the messages, use the `tag` property to
 * differentiate between different messages.
 */
export type Message = {
  +tag: MessageTag,
};

/**
 * A restricted map of message-key -> subscription-options for a given
 * message-type.
 */
export type Subscriptions<M: Message> = {
  [tag: $PropertyType<M, "tag">]: Subscription,
};

/**
 * Update containing new state-data if any, and any messages to send to
 * supervisors.
 */
export type Update<T> = {| data: T, messages: $ReadOnlyArray<Message> |};

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

/**
 * Options for a given subcription, the value true means default values for all
 * options.
 */
export type Subscription = boolean;

export type Effect<M> = {
  // FIXME: Remove srcPath once async replies is working
  /**
   * After registering an `Effect` with a `Storage` `effect` is run when a
   * message matching `subscribe` is encountered, any returned message will
   * be sent back to the source state.
   *
   * NOTE: The reply is deferred.
   */
  effect: (msg: M, srcPath: StatePath) => ?Message | Promise<?Message>,
  name?: string,
  subscribe: Subscriptions<M>,
};

export type EffectErrorMessage = {
  +tag: typeof EFFECT_ERROR,
  +error: mixed,
};

export const EFFECT_ERROR: "effect/error" = "effect/error";

export function isMatchingSubscription<M: Message>(
  subscriptions: Subscriptions<M>,
  { tag }: M
): boolean {
  return Boolean(subscriptions[tag]);
}

export function updateNone(): UpdateNoop {
  return 1;
}

/**
 * Creates an update replacing the data of the state, and if any messages
 * are provided they will be propagated upwards to supervising states and
 * effects.
 */
export function updateData<T>(data: T, ...messages: Array<Message>): Update<T> {
  return { data, messages };
}

