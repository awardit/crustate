/* @flow */

// File declaring the public API
//
// NOTE: Keep in sync with externs.js

export type {
  Message,
  MessageTag,
  MessageFilter,
  Subscription,
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
  StateDefinition,
  State,
  Supervisor,
  StateInstance,
} from "./state";

export {
  subscribe,
} from "./message";
export {
  NONE,
  update,
  updateAndSend,
} from "./update";
export {
  createRoot,
  defineState,
  getState,
  newState,
  registerState,
  sendMessage,
} from "./state";