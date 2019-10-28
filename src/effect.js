/* @flow */

import type { Message, Subscriptions } from "./message";
import type { StatePath } from "./storage";

export type Effect<M> = {
  // FIXME: Remove srcPath once async replies is working
  effect: (msg: M, srcPatH: StatePath) => ?Message | Promise<?Message>,
  subscribe: Subscriptions<M>,
};
