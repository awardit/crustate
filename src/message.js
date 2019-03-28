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

/**
 * A function filtering messages.
 */
// TODO: Can we filter messages better?
export type MessageFilter = (msg: Message) => boolean;