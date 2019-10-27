/* @flow */

import type { Message, Subscriptions } from "./message";

export type Effect<M> = {
  effect: (msg: M) => ?Message | Promise<?Message>,
  subs: Subscriptions<M>,
};
