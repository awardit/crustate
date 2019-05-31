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
 * A restricted map of message-key -> subscription-options for a given
 * message-type.
 */
export type SubscriptionMap<M: Message> = {
  [tag: $PropertyType<M, "tag">]: Subscription,
};

/**
 * Options for a given subcription, the value true means default values for all
 * options.
 */
export type Subscription = true | {
  /**
   * If the Subscription is passive it will not consume the message and it will
   * also not count towards the message being handled, default is false.
   *
   * Suitable for things which are to observe the state-changes for of other
   * states.
   */
  passive?: boolean,
  /**
   * Extra, user-supplied, filtering logic.
   */
  filter?: MessageFilter,
};

/**
 * @param {!Object} subscribers
 * @param {!crustate.Message} message
 * @param {!boolean} received
 */
export function findMatchingSubscription<M: Message>(subscribers: SubscriptionMap<M>, message: Message, received: bool): ?{ isPassive: boolean } {
  const { tag } = message;

  if( ! subscribers[tag]) {
    return null;
  }

  const subscriber = subscribers[tag];
  // const passive    = subscriber === true ? false : !!subscriber.passive;
  // const filter     = subscriber === true ? null  : subscriber.filter;

  const { passive = false, filter } = typeof subscriber === "object" ? subscriber : { passive: false, filter: null };

  if((passive || ! received) && tag === message.tag && ( ! filter || filter(message))) {
    return { isPassive: passive };
  }

  return null;
}