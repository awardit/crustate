/* @flow */

import type { EffectErrorMessage, Message } from "../src";

export type StubFn = {
  calls: Array<{ arguments: Array<mixed> }>,
};

export const args = (f: StubFn): Array<Array<mixed>> => f.calls.map(c => c.arguments);

export const unhandledMessageError = (msg: Message, path: Array<string>) =>
  ["Unhandled message:", msg, "from [" + path.join(", ") + "]."];

export const unhandledEffectError = (msg: EffectErrorMessage, path: Array<string>) =>
  ["Unhandled effect error:", msg.error, "from [" + path.join(", ") + "]."];

export const unhandledUpdateError = (error: Error, path: Array<string>) =>
  ["Unhandled update error:", error, "from [" + path.join(", ") + "]."];
