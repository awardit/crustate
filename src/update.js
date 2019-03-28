/* @flow */

import type { Message } from "./message";

/**
 * Empty update, indicates that the state has not been modified.
 *
 * @const
 */
export const NONE: NoUpdate = 0;
/**
 * The empty update.
 */
export opaque type NoUpdate = 0;
/**
 * An update containing new data for the state. Created using `update`.
 */
export opaque type DataUpdate<T> = {| stateData: T |};
/**
 * An update containing new data for the state, and a few messages. Created
 * using `updateAndSend`.
 */
export opaque type MessageUpdate<T> = {| stateData: T, outgoingMessages: Array<Message> |};
/**
 * Update containing new state-data if any, and any messages to send to supervisors.
 */
// TODO: Do we let updates just send messages?
// NOTE: Cannot be opaque since that will prevent flow to use a subsection of updates
export type Update<T> =
  | NoUpdate
  | DataUpdate<T>
  | MessageUpdate<T>;

/**
 * Creates an update replacing the data of the state.
 */
export function update<T>(data: T): DataUpdate<T> {
  return { stateData: data };
}
/**
 * Creates an update replacing the data of the state, and sends a list o
 * messages to supervisoring states.
 */
export function updateAndSend<T>(data: T, ...messages: Array<Message>): MessageUpdate<T> {
  return { stateData: data, outgoingMessages: messages };
}

/**
 * Internal: Retrieves the state data or null from an update.
 *
 * NOTE: Should not be exported so it can be inlined.
 */
export function updateStateData<T>(update: Update<T>): ?T {
  return update !== 0 ? update.stateData : null;
}
/**
 * Internal: Retrieves the array of outgoing messages from an update.
 *
 * NOTE: Should not be exported so it can be inlined.
 */
export function updateOutgoingMessages(update: Update<any>): Array<Message> {
  return update !== 0 && update.outgoingMessages ? update.outgoingMessages : [];
}
/**
 * Retrieves the data from types which are guaranteed to contain state data.
 *
 * NOTE: Should not be exported so it can be inlined.
 */
export function updateStateDataNoNone<T>(update: DataUpdate<T> | MessageUpdate<T>): T {
  return update.stateData;
}