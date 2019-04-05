/* @flow */

import ninos            from "ninos";
import ava              from "ava";
import { subscribe
       , subscriptionMatches
       , subscriptionIsPassive } from "../src/message";

const test = ninos(ava);

test("subscribe() creates a subscription", t => {
  t.deepEqual(subscribe("a"), subscribe("a"));
  t.notDeepEqual(subscribe("a"), subscribe("b"));
})

test("subscribe() is active by default", t => {
  t.is(subscriptionIsPassive(subscribe("a")), false);
  t.is(subscriptionIsPassive(subscribe("a", true)), true);
})

test("subscribe() matches exact message name", t => {
  t.is(subscriptionMatches(subscribe("a"), { tag: "a"}, false), true);
  t.is(subscriptionMatches(subscribe("a"), { tag: "b"}, false), false);
})

test("subscribe() with active matches only when not yet received", t => {
  t.is(subscriptionMatches(subscribe("a"), { tag: "a"}, false), true);
  t.is(subscriptionMatches(subscribe("a"), { tag: "b"}, false), false);
  t.is(subscriptionMatches(subscribe("a"), { tag: "a"}, true), false);
  t.is(subscriptionMatches(subscribe("a"), { tag: "b"}, true), false);
})

test("subscribe() with passive matches only when not yet received", t => {
  t.is(subscriptionMatches(subscribe("a", true), { tag: "a"}, false), true);
  t.is(subscriptionMatches(subscribe("a", true), { tag: "b"}, false), false);
  t.is(subscriptionMatches(subscribe("a", true), { tag: "a"}, true), true);
  t.is(subscriptionMatches(subscribe("a", true), { tag: "b"}, true), false);
})

test("subscribe() with condition matches only when condition is true", t => {
  // $ExpectError
  const cond = msg => msg.a;

  t.is(subscriptionMatches(subscribe("a", false, cond), { tag: "a", a: true},  false), true);
  t.is(subscriptionMatches(subscribe("a", false, cond), { tag: "a", a: false}, false), false);
  t.is(subscriptionMatches(subscribe("a", false, cond), { tag: "b", a: true},  false), false);
  t.is(subscriptionMatches(subscribe("a", false, cond), { tag: "b", a: false}, false), false);
  t.is(subscriptionMatches(subscribe("a", false, cond), { tag: "a", a: true},  true),  false);
  t.is(subscriptionMatches(subscribe("a", false, cond), { tag: "a", a: false}, true),  false);
  t.is(subscriptionMatches(subscribe("a", false, cond), { tag: "b", a: true},  true),  false);
  t.is(subscriptionMatches(subscribe("a", false, cond), { tag: "b", a: false}, true),  false);
  t.is(subscriptionMatches(subscribe("a", true, cond),  { tag: "a", a: true},  false), true);
  t.is(subscriptionMatches(subscribe("a", true, cond),  { tag: "a", a: false}, false), false);
  t.is(subscriptionMatches(subscribe("a", true, cond),  { tag: "b", a: true},  false), false);
  t.is(subscriptionMatches(subscribe("a", true, cond),  { tag: "b", a: false}, false), false);
  t.is(subscriptionMatches(subscribe("a", true, cond),  { tag: "a", a: true},  true),  true);
  t.is(subscriptionMatches(subscribe("a", true, cond),  { tag: "a", a: false}, true),  false);
  t.is(subscriptionMatches(subscribe("a", true, cond),  { tag: "b", a: true},  true),  false);
  t.is(subscriptionMatches(subscribe("a", true, cond),  { tag: "b", a: false}, true),  false);
})