/* @flow */

// File declaring the public API
//
// NOTE: Keep in sync with externs.js

// TODO: We might need to provide a separate type shim to ensure that the
//       Root and StateInstance objects are compatible with the EventEmitter
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
  stateName,
} from "./state";
export {
  createState,
  stateData,
  sendMessage,
  getNestedInstance,
} from "./instance";
export {
  createRoot,
  registerState,
  addSubscriber,
  removeSubscriber,
} from "./root";
export {
  addListener,
  removeListener,
  removeAllListeners,
  emit,
} from "./events";