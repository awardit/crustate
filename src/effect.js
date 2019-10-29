/* @flow */

import type { Message, Subscriptions } from "./message";
import type { StatePath } from "./storage";

export type Effect<M> = {
  // FIXME: Remove srcPath once async replies is working
  /**
   * After registering an `Effect` with a `Storage` `effect` is run when a
   * message matching `subscribe` is encountered, any returned message will
   * be sent back to the source state.
   *
   * NOTE: The reply is deferred.
   */
  effect: (msg: M, srcPath: StatePath) => ?Message | Promise<?Message>,
  name?: string,
  subscribe: Subscriptions<M>,
};
