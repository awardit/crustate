/* @flow */

import type { Message, Model, Subscriptions, Update } from "../src";

import test from "ava";
import { updateData } from "../src";
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
// $ExpectError
(updateData("string", null));
// $ExpectError
(updateData("string", 1));
// $ExpectError
(updateData("string", {}));
// $ExpectError
(updateData("string", { type: "foo" }));
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
  t.deepEqual(updateData(o).messages, []);
});

test("updateData() contains messages", t => {
  const o = { object: "object" };
  const m = { tag: "test" };
  const n = { tag: "another" };

  t.deepEqual(updateData(o, m), updateData(o, m));
  t.is(updateData(o, m).data, o);
  t.deepEqual(updateData(o, m).messages, [m]);
  t.deepEqual(updateData(o, m, n), updateData(o, m, n));
  t.is(updateData(o, m, n).data, o);
  t.deepEqual(updateData(o, m, n).messages, [m, n]);
});
