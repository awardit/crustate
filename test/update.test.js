/* @flow */

import type { Update } from "../src";

import test from "ava";
import { updateData, updateAndSend } from "../src";

// Type tests
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
