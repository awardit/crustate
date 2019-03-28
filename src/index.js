/* @flow */

// File declaring the public API
//
// NOTE: Keep in sync with externs.js

export type {
  Message,
  MessageTag,
  MessageFilter,
} from "./message";
export type {
  Update,
  NoUpdate,
  DataUpdate,
  MessageUpdate,
} from "./update";
export type {
  Init,
  Receive,
  Subscriptions,
  Subscription,
  StateDefinition,
  State,
  Supervisor,
  StateInstance,
} from "./state";

export {
  NONE,
  update,
  updateAndSend,
} from "./update";
export {
  createState,
  Root as StateRoot,
  sendMessage,
  newStateInstance,
  getState,
} from "./state";