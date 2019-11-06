/* @flow */

import type { Message } from "../src/message";

export type StubFn = {
  calls: Array<{ arguments: Array<mixed> }>,
};

export const args = (f: StubFn): Array<Array<mixed>> => f.calls.map(c => c.arguments);

export const unhandledMessageError = (msg: Message, path: Array<string>) =>
  ["Unhandled message:", msg, "from [", path.join(", "), "]"];
