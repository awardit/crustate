/* @flow */

/**
 * Tag identifying the message, used to subscribe and match messages.
 */
export opaque type MessageTag: string = string;
/**
 * Messages are used to inform states of new events/data which are of interest,
 * these are passed to `Receive` functions of matching states in the state-hierarchy.
 *
 * Extra data can be assigned on the messages, use the `tag` property to
 * differentiate between different messages.
 */
// FIXME: Message definition
export type Message = {
  tag: MessageTag,
};

/**
 * Empty update, indicates that the state has not been modified.
 */
export const NONE: Update<any> = 0;
/**
 * An update containing new data for the state. Created using `update`.
 */
export opaque type DataUpdate<T>    = [T];
/**
 * An update containing new data for the state, and a few messages. Created
 * using `updateAndSend`.
 */
export opaque type MessageUpdate<T> = [T, Array<Message>];
/**
 * Update containing new state-data if any, and any messages to send to supervisors.
 */
// TODO: Do we let updates just send messages?
export opaque type Update<T> =
  | typeof NONE
  | DataUpdate<T>
  | MessageUpdate<T>;

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
  // TODO: Can we (or should we) merge this with the `matcher`?
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

/**
 * Initialization function, called when the initial data is loaded into the state.
 */
export type Init<T, I> = (init: I) => DataUpdate<T> | MessageUpdate<T>;
/**
 * Receive function, receives messages for a state and produces a state-update
 * which can include messages sent to supervisors.
 */
export type Receive<T> = (state: T, msg: Message) => Update<T>;
/**
 * A list of subscriptions
 */
export type Subscriptions<T> = (state: T) => Array<Subscription>;

/**
 * Definition of a state containing the data `T` which can be instantiated given
 * the initial data `I`.
 */
export type StateDefiniton<T, I> = {
  name:          string,
  init:          Init<T, I>,
  receive:       Receive<T>,
  subscriptions: Subscriptions<T>,
};

/**
 * Creates an update replacing the data of the state.
 */
export function update<T>(data: T): Update<T> {
  return [data];
}
/**
 * Creates an update replacing the data of the state, and sends a list o
 * messages to supervisoring states.
 */
export function updateAndSend<T>(data: T, ...messages: Array<Message>): Update<T> {
  return [data, messages];
}

/**
 * Function for obtaining the new data for a given update.
 */
// TODO: Naming
export function __getUpdateData<T>(update: Update<T>): ?T {
  if(update === 0) {
    return null;
  }

  return update[0];
}
