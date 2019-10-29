/* @flow */

// File declaring the public API
//
// NOTE: Keep in sync with externs.js

export type { Effect } from "./effect";
export type {
  Message,
  MessageTag,
  MessageFilter,
  Subscriptions,
  Subscription,
} from "./message";
export type { Update } from "./update";
export type {
  Model,
  ModelInit,
  ModelSubscribe,
  ModelUpdate,
  TypeofModelData,
  TypeofModelInit,
} from "./model";
export type {
  RunningEffect,
  Snapshot,
  StatePath,
  StateSnapshot,
} from "./storage";

export { EFFECT_ERROR } from "./message";
export { updateData, updateAndSend } from "./update";
export {
  State,
  Storage,
} from "./storage";
