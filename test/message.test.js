/* @flow */

import type { Message, SubscriptionMap } from "../src/message";

import ninos from "ninos";
import ava from "ava";
import { findMatchingSubscription } from "../src/message";

// Type tests
type AMessage = { tag: "a" };
type BMessage = { tag: string, foo: boolean };

(({ tag: "a" }: AMessage): Message);
(({ tag: "b", foo: true }: BMessage): Message);

(({ a: true }): SubscriptionMap<AMessage>);
(({ b: true }): SubscriptionMap<AMessage | BMessage>);
// $ExpectError
(({ c: true }): SubscriptionMap<AMessage>);

const test = ninos(ava);

test("findMatchingSubscription() ", t => {
  t.deepEqual(findMatchingSubscription({}, { tag: "a" }, false), null);
  t.deepEqual(findMatchingSubscription({ b: true }, { tag: "a" }, false), null);
  t.deepEqual(findMatchingSubscription({}, { tag: "a" }, true), null);
  t.deepEqual(findMatchingSubscription({ b: true }, { tag: "a" }, true), null);
  t.deepEqual(findMatchingSubscription({ a: true }, { tag: "a" }, true), null);
});

test("findMatchingSubscription() is active by default", t => {
  t.deepEqual(findMatchingSubscription({ a: true }, { tag: "a" }, false), { isPassive: false });
  t.deepEqual(findMatchingSubscription({ a: true }, { tag: "a" }, true), null);
});

test("findMatchingSubscription() matches exact message name", t => {
  t.deepEqual(findMatchingSubscription({ a: true }, { tag: "a" }, false), { isPassive: false });
  t.deepEqual(findMatchingSubscription({ a: true }, { tag: "b" }, false), null);
});

test("findMatchingSubscription() matches received messages if they are passive", t => {
  t.deepEqual(findMatchingSubscription({ a: { passive: true } }, { tag: "a" }, false), { isPassive: true });
  t.deepEqual(findMatchingSubscription({ a: { passive: true } }, { tag: "a" }, true), { isPassive: true });
  t.deepEqual(findMatchingSubscription({ a: { passive: true } }, { tag: "b" }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { passive: true } }, { tag: "b" }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { passive: false } }, { tag: "a" }, true), null);
  t.deepEqual(findMatchingSubscription({ a: { passive: false } }, { tag: "b" }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { passive: false } }, { tag: "b" }, false), null);
});

test("findMatchingSubscription() with a filter", t => {
  const filter = msg => msg.a;

  t.deepEqual(findMatchingSubscription({ a: { filter } }, { tag: "a", a: false }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { filter } }, { tag: "a", a: true }, false), { isPassive: false });
  t.deepEqual(findMatchingSubscription({ a: { filter } }, { tag: "a", a: false }, true), null);
  t.deepEqual(findMatchingSubscription({ a: { filter } }, { tag: "a", a: true }, true), null);
  t.deepEqual(findMatchingSubscription({ a: { filter, passive: true } }, { tag: "a", a: false }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { filter, passive: true } }, { tag: "a", a: true }, false), { isPassive: true });
  t.deepEqual(findMatchingSubscription({ a: { filter, passive: true } }, { tag: "a", a: false }, true), null);
  t.deepEqual(findMatchingSubscription({ a: { filter, passive: true } }, { tag: "a", a: true }, true), { isPassive: true });
  t.deepEqual(findMatchingSubscription({ a: { filter } }, { tag: "b", a: false }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { filter } }, { tag: "b", a: true }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { filter } }, { tag: "b", a: false }, true), null);
  t.deepEqual(findMatchingSubscription({ a: { filter } }, { tag: "b", a: true }, true), null);
  t.deepEqual(findMatchingSubscription({ a: { filter, passive: true } }, { tag: "b", a: false }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { filter, passive: true } }, { tag: "b", a: true }, false), null);
  t.deepEqual(findMatchingSubscription({ a: { filter, passive: true } }, { tag: "b", a: false }, true), null);
  t.deepEqual(findMatchingSubscription({ a: { filter, passive: true } }, { tag: "b", a: true }, true), null);
});