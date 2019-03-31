/* @flow */

import type { EventEmitter } from "./events";
import ninos from "ninos";
import ava from "ava";
import { addListener
       , removeListener
       , removeAllListeners
       , listeners
       , emit } from "./events";

const test = ninos(ava);

// Type tests
({ listeners: {} }: EventEmitter);
// $ExpectError
({ listeners: [] }: EventEmitter);
({ listeners: { "foo": () => null } }: EventEmitter);
// $ExpectError
({ listeners: { "foo": null } }: EventEmitter);
({ listeners: { "foo": [() => null] } }: EventEmitter);

test("emit() does nothing on empty", t => {
  const emitter = { listeners: {} };

  emit(emitter, "foo");

  t.deepEqual(emitter, { listeners: {} });
});

test("emit() does nothing on undefined", t => {
  const emitter = { listeners: { "foo": undefined } };

  // $ExpectError we have something we are not supposed to use
  emit(emitter, "foo");

  t.deepEqual(emitter, { listeners: { "foo": undefined } });
});

test("emit() calls a single listener", t => {
  const stub    = t.context.stub();
  const emitter = { listeners: { "foo": stub } };

  emit(emitter, "foo");

  t.deepEqual(stub.calls, [
    { this: null, arguments: [], return: undefined },
  ]);
});

test("emit() calls a single listener with all arguments", t => {
  const stub    = t.context.stub();
  const emitter = { listeners: { "foo": stub } };

  emit(emitter, "foo", "arg1");
  emit(emitter, "foo", "arg1", "arg2");
  emit(emitter, "foo", "arg1", "arg2", "arg3");

  t.deepEqual(stub.calls, [
    { this: null, arguments: ["arg1"], return: undefined },
    { this: null, arguments: ["arg1", "arg2"], return: undefined },
    { this: null, arguments: ["arg1", "arg2", "arg3"], return: undefined },
  ]);
});

test("emit() does not call unrelated events", t => {
  const noCall  = t.context.stub();
  const emitter = { listeners: { "bar": noCall } };

  emit(emitter, "foo");

  t.deepEqual(emitter, { listeners: { "bar": noCall } });
  t.deepEqual(noCall.calls, []);
});

test("emit() calls all listeners", t => {
  const stub1   = t.context.stub();
  const stub2   = t.context.stub();
  const emitter = { listeners: { "foo": [stub1, stub2] } };

  emit(emitter, "foo", "arg1");

  t.deepEqual(stub1.calls, [
    { this: null, arguments: ["arg1"], return: undefined },
  ]);
  t.deepEqual(stub2.calls, [
    { this: null, arguments: ["arg1"], return: undefined },
  ]);
})