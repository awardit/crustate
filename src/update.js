/* @flow */

import type { Message } from "./message";

/**
 * The empty update.
 */
export opaque type NoUpdate = 0;

/**
 * An update containing new data for the state. Created using `update`.
 */
export opaque type DataUpdate<T> = {| _stateData: T |};

/**
 * An update containing new data for the state, and a few messages. Created
 * using `updateAndSend`.
 */
export opaque type MessageUpdate<T> = {|
  _stateData: T,
  _outgoingMessages: Array<Message>,
|};

/**
 * Update containing new state-data if any, and any messages to send to
 * supervisors.
 * NOTE: Cannot be opaque since that will prevent flow to use a subsection of
 *       updates
 */
// TODO: Do we let updates just send messages?
export type Update<T> =
  | NoUpdate
  | DataUpdate<T>
  | MessageUpdate<T>;

/**
 * Empty update, indicates that the state has not been modified.
 *
 * @export
 * @const
 */
export const NONE: NoUpdate = 0;

/**
 * Creates an update replacing the data of the state.
 *
 * @export
 */
export function updateData<T>(data: T): DataUpdate<T> {
  return { _stateData: data };
}

/**
 * Creates an update replacing the data of the state, and sends a list o
 * messages to supervisoring states.
 *
 * @export
 */
export function updateAndSend<T>(data: T, ...messages: Array<Message>): MessageUpdate<T> {
  return { _stateData: data, _outgoingMessages: messages };
}

export function updateHasData(update: Update<any>): boolean %checks {
  return update !== 0;
}

/**
 * Internal: Retrieves the state data or null from an update.
 *
 * NOTE: Should not be exported so it can be inlined.
 */
export function updateStateData<T>(update: Update<T>): ?T {
  return updateHasData(update) ? update._stateData : null;
}

/**
 * Internal: Retrieves the array of outgoing messages from an update.
 *
 * NOTE: Should not be exported so it can be inlined.
 */
export function updateOutgoingMessages(update: Update<any>): Array<Message> {
  return updateHasData(update) && update._outgoingMessages ?
    update._outgoingMessages :
    [];
}

/**
 * Retrieves the data from types which are guaranteed to contain state data.
 *
 * NOTE: Should not be exported so it can be inlined.
 */
export function updateStateDataNoNone<T>(update: DataUpdate<T> | MessageUpdate<T>): T {
  return update._stateData;
}