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
 * A message on its way upwards in the hierarchy.
 */
export type InflightMessage = {
  +_message: Message,
  +_source: StatePath,
};

/**
 * A restricted map of message-key -> subscription-options for a given
 * message-type.
 */
export type Subscriptions<M: Message> = {
  [tag: $PropertyType<M, "tag">]: Subscription,
};

/**
 * Options for a given subcription, the value true means default values for all
 * options.
 */
export type Subscription = boolean;

export function isMatchingSubscription<M: Message>(
  subscriptions: Subscriptions<M>,
  { tag }: M
): boolean {
  return Boolean(subscriptions[tag]);
}
