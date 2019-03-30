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
} from "./state";
export type {
  Supervisor,
  StateInstance,
} from "./instance";
export type {
  Root,
} from "./root";

export {
  subscribe,
} from "./message";
export {
  NONE,
  update,
  updateAndSend,
} from "./update";
export {
  defineState,
} from "./state";
export {
  newState,
  sendMessage,
  getNestedInstance,
} from "./instance";
export {
  createRoot,
  registerState,
} from "./root";