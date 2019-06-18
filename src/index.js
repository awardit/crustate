/* @flow */

// File declaring the public API
//
// NOTE: Keep in sync with externs.js

export type {
  Message,
  MessageTag,
  MessageFilter,
  SubscriptionMap,
  Subscription
} from "./message";
export type { Update, NoUpdate, DataUpdate, MessageUpdate } from "./update";
export type { Init, StateUpdate, Subscribe, State, StatePath } from "./state";
export type { Supervisor, Snapshot, StateSnapshot } from "./storage";

export { NONE, updateData, updateAndSend } from "./update";
export { StateInstance, Storage } from "./storage";