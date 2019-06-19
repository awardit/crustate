/* @flow */

import type { Update } from "../src/update";

import test from "ava";
import {
  NONE,
  updateData,
  updateHasData,
  updateAndSend,
  updateStateData,
  updateOutgoingMessages,
  updateStateDataNoNone,
} from "../src/update";

// Type tests
(NONE: Update<null>);
(NONE: Update<string>);
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
(NONE: DataUpdate<any>);
// $ExpectError
(NONE: MessageUpdate<any>);

test("NONE contains no data", t => {
  t.is(updateStateData(NONE), null);
  t.is(updateHasData(NONE), false);
});

test("NONE has no messages", t => {
  t.deepEqual(updateOutgoingMessages(NONE), []);
});

test("updateData() contains data", t => {
  const o = { object: "object" };

  t.deepEqual(updateData(o), updateData(o));
  t.is(updateHasData(updateData(o)), true);
  t.is(updateStateData(updateData(o)), o);
  t.is(updateStateDataNoNone(updateData(o)), o);
});

test("updateData() has no messages", t => {
  t.deepEqual(updateOutgoingMessages(updateData(null)), []);
  t.deepEqual(updateOutgoingMessages(updateData(0)), []);
});

test("updateAndSend() contains data", t => {
  const o = { object: "object" };

  t.deepEqual(updateAndSend(o), updateAndSend(o));
  t.is(updateHasData(updateAndSend(o)), true);
  t.is(updateStateData(updateAndSend(o)), o);
  t.is(updateStateDataNoNone(updateAndSend(o)), o);
});

test("updateAndSend() contains messages", t => {
  const o = { object: "object" };
  const m = { tag: "test" };
  const n = { tag: "another" };

  t.deepEqual(updateAndSend(o, m), updateAndSend(o, m));
  t.is(updateHasData(updateAndSend(o, m)), true);
  t.is(updateStateData(updateAndSend(o, m)), o);
  t.deepEqual(updateOutgoingMessages(updateAndSend(o, m)), [m]);
  t.deepEqual(updateAndSend(o, m, n), updateAndSend(o, m, n));
  t.is(updateHasData(updateAndSend(o, m, n)), true);
  t.is(updateStateData(updateAndSend(o, m, n)), o);
  t.deepEqual(updateOutgoingMessages(updateAndSend(o, m, n)), [m, n]);
});
