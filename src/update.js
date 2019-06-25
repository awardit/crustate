/* @flow */

import type { Message } from "./message";

/**
 * Update containing new state-data if any, and any messages to send to
 * supervisors.
 *
 * NOTE: Cannot be opaque since that will prevent flow to use a subsection of
 *       updates
 */
// TODO: Do we let updates just send messages?
export type Update<T> = {| data: T, messages: ?Array<Message> |};

/**
 * Creates an update replacing the data of the state.
 *
 * @export
 */
export function updateData<T>(data: T): Update<T> {
  return { data, messages: null };
}

/**
 * Creates an update replacing the data of the state, and sends a list o
 * messages to supervisoring states.
 *
 * @export
 */
export function updateAndSend<T>(data: T, ...messages: Array<Message>): Update<T> {
  return { data, messages };
}
