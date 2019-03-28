/* @flow */

import type { Update } from "./update"
import test from "ava";
import { NONE
       , update
       , updateAndSend
       , updateStateData
       , updateOutgoingMessages
       , updateStateDataNoNone } from "./update";

// Type tests
(NONE: Update<null>);
(NONE: Update<string>);
(update(null): Update<null>);
(update("string"): Update<string>);
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
});

test("NONE has no messages", t => {
  t.deepEqual(updateOutgoingMessages(NONE), []);
});

test("update() contains data", t => {
  const o = { object: "object" };

  t.deepEqual(update(o), update(o));
  t.is(updateStateData(update(o)), o);
  t.is(updateStateDataNoNone(update(o)), o);
});

test("update() has no messages", t => {
  t.deepEqual(updateOutgoingMessages(update(null)), []);
  t.deepEqual(updateOutgoingMessages(update(0)), []);
})

test("updateAndSend() contains data", t => {
  const o = { object: "object" };

  t.deepEqual(updateAndSend(o), updateAndSend(o));
  t.is(updateStateData(updateAndSend(o)), o);
  t.is(updateStateDataNoNone(updateAndSend(o)), o);
});

test("updateAndSend() contains messages", t => {
  const o = { object: "object" };
  const m = { tag: "test" };
  const n = { tag: "another" };

  t.deepEqual(updateAndSend(o, m), updateAndSend(o, m));
  t.is(updateStateData(updateAndSend(o, m)), o);
  t.deepEqual(updateOutgoingMessages(updateAndSend(o, m)), [m]);
  t.deepEqual(updateAndSend(o, m, n), updateAndSend(o, m, n));
  t.is(updateStateData(updateAndSend(o, m, n)), o);
  t.deepEqual(updateOutgoingMessages(updateAndSend(o, m, n)), [m, n]);
});