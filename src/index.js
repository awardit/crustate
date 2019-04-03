/* @flow */

// File declaring the public API
//
// NOTE: Keep in sync with externs.js

// TODO: We might need to provide a separate type shim to ensure that the
//       Storage and StateInstance objects are compatible with the EventEmitter
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
} from "./instance";

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
  stateName,
} from "./state";
export {
  StateInstance,
  stateData,
  createState,
} from "./instance";
export {
  Storage,
} from "./storage";