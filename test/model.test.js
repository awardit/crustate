/* @flow */

import type { Message, Model, Subscriptions, Update } from "../src";

import test from "ava";
import { updateData, updateAndSend } from "../src";
import { isMatchingSubscription } from "../src/model";

// Type tests
type AMessage = { tag: "a" };
type BMessage = { tag: string, foo: boolean };
type MyMessage = { tag: "a" } | { tag: "b" };

(null: ?Update<null>);
(null: ?Update<string>);
(undefined: ?Update<null>);
(undefined: ?Update<string>);
(updateData(null): Update<null>);
(updateData("string"): Update<string>);
(updateAndSend(null): Update<null>);
(updateAndSend("string"): Update<string>);
// $ExpectError
(updateAndSend("string", null));
// $ExpectError
(updateAndSend("string", 1));
// $ExpectError
(updateAndSend("string", {}));
// $ExpectError
(updateAndSend("string", { type: "foo" }));
// $ExpectError
(null: Update<any>);
// $ExpectError
(undefined: Update<any>);

(({ tag: "a" }: AMessage): Message);
(({ tag: "b", foo: true }: BMessage): Message);

(({ a: true }): Subscriptions<AMessage>);
(({ b: true }): Subscriptions<AMessage | BMessage>);
// $ExpectError
(({ c: true }): Subscriptions<AMessage>);

({
  id: "test",
  init: () => updateData("init"),
  update: () => null,
}: Model<string, void, MyMessage>);

test("Model can be instantiated", t => {
  const definition: Model<string, void, Message> = {
    id: "test",
    init: () => updateData("init"),
    update: (data, msg) => updateData(msg.tag),
  };

  t.deepEqual(definition.init(), updateData("init"));
  t.deepEqual(definition.update("init", { tag: "foo" }), updateData("foo"));
});

test("isMatchingSubscription() ", t => {
  t.is(isMatchingSubscription({}, { tag: "a" }), false);
  t.is(isMatchingSubscription({ b: true }, { tag: "a" }), false);
  t.is(isMatchingSubscription({}, { tag: "a" }), false);
  t.is(isMatchingSubscription({ b: true }, { tag: "a" }), false);
  t.is(isMatchingSubscription({ a: true }, { tag: "a" }), true);
});

test("updateData() contains data", t => {
  const o = { object: "object" };

  t.deepEqual(updateData(o), updateData(o));
  t.is(updateData(o).data, o);
  t.is(updateData(o).messages, null);
});

test("updateAndSend() contains data", t => {
  const o = { object: "object" };

  t.deepEqual(updateAndSend(o), updateAndSend(o));
  t.is(updateAndSend(o).data, o);
  t.deepEqual(updateAndSend(o).messages, []);
});

test("updateAndSend() contains messages", t => {
  const o = { object: "object" };
  const m = { tag: "test" };
  const n = { tag: "another" };

  t.deepEqual(updateAndSend(o, m), updateAndSend(o, m));
  t.is(updateAndSend(o, m).data, o);
  t.deepEqual(updateAndSend(o, m).messages, [m]);
  t.deepEqual(updateAndSend(o, m, n), updateAndSend(o, m, n));
  t.is(updateAndSend(o, m, n).data, o);
  t.deepEqual(updateAndSend(o, m, n).messages, [m, n]);
});
