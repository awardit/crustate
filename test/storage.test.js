/* @flow */

import ninos            from "ninos";
import ava              from "ava";
import { Storage } from "../src/storage";
import { subscribe } from "../src/message";

const test = ninos(ava);

test("Storage can be created without parameters and is empty", t => {
  const s = new Storage();

  t.is(s instanceof Storage, true);
  t.is(s.getStorage(), s);
  t.deepEqual(s.getPath(), []);
  t.deepEqual(s.getSnapshot(), {});
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, {});
  t.deepEqual(s._subscribers, []);
  t.deepEqual(s._eventListeners, {});
});

test("Storage is not modified when querying for state-instances or definitions", t => {
  const s = new Storage();

  t.is(s.stateDefinition("foo"), undefined);
  // $ExpectError minimal State instance for this
  t.is(s.getNested({ name: "foo" }), undefined);
  t.deepEqual(s.getSnapshot(), {});
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, {});
  t.deepEqual(s._subscribers, []);
  t.deepEqual(s._eventListeners, {});
});

test("Storage can register state definitons", t => {
  const s = new Storage();
  const stub1 = t.context.stub();
  const stub2 = t.context.stub();
  const stub3 = t.context.stub();
  const state = { name: "test", init: stub1, update: stub2, subscriptions: stub3 };

  t.is(s.registerState(state), undefined);
  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.deepEqual(s._eventListeners, {});
  t.deepEqual(stub1.calls, []);
  t.deepEqual(stub2.calls, []);
  t.deepEqual(stub3.calls, []);
});

test("Storage rejects duplicate state definitions", t => {
  const s = new Storage();
  const stub1 = t.context.stub();
  const stub2 = t.context.stub();
  const stub3 = t.context.stub();
  const state = { name: "test", init: stub1, update: stub2, subscriptions: stub3 };

  t.is(s.registerState(state), undefined);
  t.throws(() => s.registerState(state), { instanceOf: Error, message: "Duplicate state name test"});

  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.deepEqual(s._eventListeners, {});
  t.deepEqual(stub1.calls, []);
  t.deepEqual(stub2.calls, []);
  t.deepEqual(stub3.calls, []);
});

test.todo("More Storage tests");
test.todo("StateInstance tests");