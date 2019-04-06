/* @flow */

import ninos            from "ninos";
import test             from "ava";
import { Storage } from "../src/storage";
import { subscribe } from "../src/message";

test("Storage can be created without parameters and is empty", t => {
  const s = new Storage();

  t.is(s instanceof Storage, true);
  t.is(s.getStorage(), s);
  t.deepEqual(s.getPath(), []);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, {});
  t.deepEqual(s._subscribers, []);
  t.deepEqual(s._eventListeners, {});
});

test.todo("more")