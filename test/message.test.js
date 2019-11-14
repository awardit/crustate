/* @flow */

import type { Message, Subscriptions } from "../src/message";

import ninos from "ninos";
import ava from "ava";
import { isMatchingSubscription } from "../src/message";

// Type tests
type AMessage = { tag: "a" };
type BMessage = { tag: string, foo: boolean };

(({ tag: "a" }: AMessage): Message);
(({ tag: "b", foo: true }: BMessage): Message);

(({ a: true }): Subscriptions<AMessage>);
(({ b: true }): Subscriptions<AMessage | BMessage>);
// $ExpectError
(({ c: true }): Subscriptions<AMessage>);

const test = ninos(ava);

test("isMatchingSubscription() ", t => {
  t.deepEqual(isMatchingSubscription({}, { tag: "a" }), false);
  t.deepEqual(isMatchingSubscription({ b: true }, { tag: "a" }), false);
  t.deepEqual(isMatchingSubscription({}, { tag: "a" }), false);
  t.deepEqual(isMatchingSubscription({ b: true }, { tag: "a" }), false);
  t.deepEqual(isMatchingSubscription({ a: true }, { tag: "a" }), true);
});

