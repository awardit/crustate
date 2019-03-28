/* @flow */

import type { StatePath } from "./state";

/**
 * Tag identifying the message, used to subscribe and match messages.
 */
// TODO: Opaque type?
export type MessageTag = string;
/**
 * Messages are used to inform states of new events/data which are of interest,
 * these are passed to `Receive` functions of matching states in the state-hierarchy.
 *
 * Extra data can be assigned on the messages, use the `tag` property to
 * differentiate between different messages.
 */
export type Message = {
  tag: MessageTag,
};

/**
 * A message on its way upwards in the hierarchy.
 */
export type InflightMessage = {
  message:  Message,
  source:   StatePath,
  /**
   * If an active subscription has received this message this is the state path
   * which received it.
   */
  received: ?StatePath,
};

// TODO: Target needs some way of getting marked as dirty, or the whole tree
export type Target = {
  inbox: Array<InflightMessage>,
};

/**
 * Queues a list of messages on the supplied target. `source` is the named
 * path to the orign state.
 *
 * NOTE: Needs to mark the root as dirty.
 */
export function enqueue(target: Target, source: StatePath, messages: Array<Message>): void {
  target.inbox = target.inbox.concat(messages.map(message => ({
    message,
    source,
    received: null,
  })));
}

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
  matcher: MessageFilter | null,
};

export function subscribe(tag: MessageTag, passive: boolean = false, matcher: MessageFilter | null = null): Subscription {
  return {
    tag,
    passive,
    matcher,
  };
}

/**
 * Constructs a filter for `InflightMessage` to only match any of subscription.
 */
export function subscriptionFilter(subscriptions: Array<Subscription>): (msg: InflightMessage) => boolean {
  return ({ message, received }: InflightMessage): boolean =>
    subscriptions.some(({ tag, passive, matcher }) => (passive || ! received) && tag === message.tag && ( ! matcher || matcher(message)));
}