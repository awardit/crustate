/* @flow */

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

export type InflightMessage = {
  message:  Message,
  source:   Array<string>,
  /**
   * If an active subscription has received this message.
   */
  received: boolean,
  // TODO: Add extra data about source state path and so on so we can respond and track
};

// TODO: Target needs some way of getting marked as dirty, or the whole tree
export type Target = {
  inbox: Array<InflightMessage>.
};

/**
 * A function filtering messages.
 */
// TODO: Can we filter messages better?
export type MessageFilter = (msg: Message) => boolean;

/**
 * Queues a list of messages on the supplied target. `source` is the named
 * path to the orign state.
 */
export function queueMessages(target: Target, source: Array<string>, messages: Array<Message>): void {
  // TODO: How to obtain root?
  const stateRoot  = supervisor instanceof Root ? supervisor : supervisor.stateRoot;

  stateRoot.setDirty(source);

  target.inbox = target.inbox.concat(messages.map(message => ({
    message,
    source,
    received: false,
  })));
}