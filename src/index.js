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
  StateInstance,
} from "./instance";
export type {
  Storage,
} from "./storage";

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
  createState,
  stateData,
  sendMessage,
  getNestedInstance,
} from "./instance";
export {
  createStorage,
  registerState,
  addSubscriber,
  removeSubscriber,
} from "./storage";
export {
  addListener,
  removeListener,
  removeAllListeners,
  emit,
} from "./events";