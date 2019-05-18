/* @flow */

import type { StatePath } from "./state";

/**
 * Tag identifying the message, used to subscribe and match messages.
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
  _message:  Message,
  _source:   StatePath,
  /**
   * If an active subscription has received this message this is the state path
   * which received it.
   */
  _received: ?StatePath,
};

/**
 * A function filtering messages.
 */
// TODO: Can we filter messages better?
export type MessageFilter = (msg: Message) => boolean;

/**
 * A filter identifying messages a State can respond to.
 */
export opaque type Subscription = {
  /**
   * The message tag to subscribe to.
   */
  // TODO: Can we (or should we) merge this with the `matcher` in a subscribe constructor?
  tag:     MessageTag,
  /**
   * If the Subscription is passive it will not consume the message and it will
   * also not count towards the message being handled.
   *
   * Suitable for things which are to observe the state-changes for of other
   * states.
   */
  passive: boolean,
  /**
   * Extra, user-supplied, filtering logic.
   */
  filter: MessageFilter | null,
};

// TODO: Avoid the boolean parameter
export function subscribe(tag: MessageTag, passive: boolean = false, filter: MessageFilter | null = null): Subscription {
  return {
    tag,
    passive,
    filter,
  };
}

/**
 * @param {!Object} subscription
 * @param {!crustate.Message} message
 * @param {!boolean} received
 */
export function subscriptionMatches(subscription: Subscription, message: Message, received: bool): boolean {
  const { tag, passive, filter } = subscription;

  return (passive || ! received)
      && tag === message.tag
      && ( ! filter || filter(message));
}

/**
 * Internal
 */
export function subscriptionIsPassive({ passive }: Subscription): boolean {
  return passive;
}