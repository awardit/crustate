/* @flow */

import ninos            from "ninos";
import ava              from "ava";
import { Storage
       , StateInstance } from "../src/storage";
import { updateData } from "../src/update";
import { subscribe } from "../src/message";

// We redefine this here so we can test it
const MESSAGE_NEW_PARAMS = "gurka/stateNewParams";

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
  t.deepEqual(stub1.calls, []);
  t.deepEqual(stub2.calls, []);
  t.deepEqual(stub3.calls, []);
});

test("Storage getNestedOrCreate creates a new state instance", t => {
  const s             = new Storage();
  const initData      = { name: "initData" };
  const init          = t.context.stub(() => updateData(initData));
  const update        = t.context.stub();
  const subscriptions = t.context.stub(() => []);
  const state         = { name: "test", init, update, subscriptions };
  const instance      = s.getNestedOrCreate(state);

  t.is(instance instanceof StateInstance, true);
  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), instance);
  t.deepEqual(s.getSnapshot(), { test: { defName: "test", data: { name: "initData" }, params: undefined, nested: {} } });
  // Looking at internals
  t.deepEqual(s._nested, { test: instance });
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.is(init.calls.length, 1)
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 0);
  t.is(subscriptions.calls.length, 0);
});

test("Storage getNestedOrCreate returns the same instance given the same params", t => {
  const s             = new Storage();
  const initData      = { name: "initData" };
  const init          = t.context.stub(() => updateData(initData));
  const update        = t.context.stub();
  const subscriptions = t.context.stub(() => []);
  const state         = { name: "test", init, update, subscriptions };
  const instance      = s.getNestedOrCreate(state);
  const instance2     = s.getNestedOrCreate(state);

  t.is(instance, instance2);
  t.is(init.calls.length, 1)
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 0);
  t.is(subscriptions.calls.length, 0);
});

test.failing("Storage getNestedOrCreate sends an update message and returns the same instance when new params are supplied", t => {
  const s             = new Storage();
  const initData      = { name: "initData" };
  const init          = t.context.stub(() => updateData(initData));
  const update        = t.context.stub((state, msg) => updateData(msg.params));
  const subscriptions = t.context.stub(() => [subscribe(MESSAGE_NEW_PARAMS)]);
  const state         = { name: "test", init, update, subscriptions };
  const instance      = s.getNestedOrCreate(state, 1);
  const instance2     = s.getNestedOrCreate(state, 2);

  t.is(instance, instance2);
  t.is(init.calls.length, 1)
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 1);
  t.is(init.calls[0].arguments[0], initData);
  t.deepEquals(init.calls[0].arguments[1], { tag: MESSAGE_NEW_PARAMS, params: 2 });
  t.is(subscriptions.calls.length, 1);
  t.is(subscriptions.calls[0].arguments[0], initData);
});

test("Storage getNestedOrCreate throws when trying to use a new state definition with the same identifier", t => {
  const s             = new Storage();
  const initData      = { name: "initData" };
  const init          = t.context.stub(() => updateData(initData));
  const update        = t.context.stub();
  const subscriptions = t.context.stub(() => []);
  const state         = { name: "test", init, update, subscriptions };
  const state2        = { name: "test", init, update, subscriptions };
  s.registerState(state);
  t.throws(() => s.getNestedOrCreate(state2), { instanceOf: Error, message: "State object mismatch for state test" });

  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.is(init.calls.length, 0)
  t.is(update.calls.length, 0);
  t.is(subscriptions.calls.length, 0);
});

test("Storage getNested on non-existing state instance should throw when using a mismatched state-definition of same name in dev-mode", t => {
  const s             = new Storage();
  const initData      = { name: "initData" };
  const init          = t.context.stub(() => updateData(initData));
  const update        = t.context.stub();
  const subscriptions = t.context.stub(() => []);
  const state         = { name: "test", init, update, subscriptions };
  const state2        = { name: "test", init, update, subscriptions };
  s.registerState(state);
  t.throws(() => s.getNested(state2), { instanceOf: Error, message: "State object mismatch for state test" });

  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.is(init.calls.length, 0)
  t.is(update.calls.length, 0);
  t.is(subscriptions.calls.length, 0);
});

test("Storage getNested on non-existing state instance should return undefined when using a mismatched state-definition of same name in dev-mode", t => {
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const s             = new Storage();
    const initData      = { name: "initData" };
    const init          = t.context.stub(() => updateData(initData));
    const update        = t.context.stub();
    const subscriptions = t.context.stub(() => []);
    const state         = { name: "test", init, update, subscriptions };
    const state2        = { name: "test", init, update, subscriptions };

    s.registerState(state);
    t.is(s.getNested(state2), undefined);

    t.is(s.stateDefinition("test"), state);
    t.is(s.getNested(state), undefined);
    t.deepEqual(s.getSnapshot(), {});
    // Looking at internals
    t.deepEqual(s._nested, {});
    t.deepEqual(s._defs, { test: state });
    t.deepEqual(s._subscribers, []);
    t.is(init.calls.length, 0)
    t.is(update.calls.length, 0);
    t.is(subscriptions.calls.length, 0);
  }
  finally {
    process.env.NODE_ENV = nodeEnv;
  }
});

test("Sending messages on an empty storage only results in unhandledMessage events", t => {
  const s    = new Storage();
  const recv = t.context.stub();
  const msg  = { tag: "testMessage" };

  s.addListener("unhandledMessage", recv);
  s.sendMessage(msg);

  t.is(recv.calls.length, 1);
  t.is(recv.calls[0].arguments[0], msg);
  t.deepEqual(recv.calls[0].arguments[1], []);
});

test("Sending messages on a store should send them to matching subscribers", t => {
  const s     = new Storage();
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const recv3 = t.context.stub();
  const msg   = { tag: "testMessage" };
  const msg2  = { tag: "uncaught" };

  s.addListener("unhandledMessage", recv1);
  s.addSubscriber(recv2, [subscribe("testMessage")]);
  s.addSubscriber(recv3, [subscribe("fooMessage")]);

  s.sendMessage(msg);

  t.is(recv1.calls.length, 0);
  t.is(recv2.calls.length, 1);
  t.is(recv2.calls[0].arguments[0], msg);
  t.deepEqual(recv2.calls[0].arguments[1], []);
  t.is(recv3.calls.length, 0);

  s.sendMessage(msg2);

  t.is(recv1.calls.length, 1);
  t.is(recv1.calls[0].arguments[0], msg2);
  t.deepEqual(recv2.calls[0].arguments[1], []);
  t.is(recv2.calls.length, 1);
  t.is(recv2.calls[0].arguments[0], msg);
  t.deepEqual(recv2.calls[0].arguments[1], []);
  t.is(recv3.calls.length, 0);
});

test("Removing a subscriber should not fire when a matching message is sent", t => {
  const s     = new Storage();
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const msg   = { tag: "testMessage" };

  s.addSubscriber(recv1, [subscribe("testMessage")]);
  s.addSubscriber(recv2, [subscribe("testMessage")]);
  s.removeSubscriber(recv2);

  s.sendMessage(msg);

  t.is(recv1.calls.length, 1);
  t.is(recv1.calls[0].arguments[0], msg);
  t.deepEqual(recv1.calls[0].arguments[1], []);
  t.is(recv2.calls.length, 0);
});

test("Sending messages on a store should also trigger unhandledMessage if no active subscribers are present", t => {
  const s     = new Storage();
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const msg   = { tag: "testMessage" };

  s.addListener("unhandledMessage", recv1);
  s.addSubscriber(recv2, [subscribe("testMessage", true)]);

  s.sendMessage(msg);

  t.is(recv1.calls.length, 1);
  t.is(recv1.calls[0].arguments[0], msg);
  t.deepEqual(recv1.calls[0].arguments[1], []);
  t.is(recv2.calls.length, 1);
  t.is(recv2.calls[0].arguments[0], msg);
  t.deepEqual(recv2.calls[0].arguments[1], []);
});

test.todo("More Storage tests");
test.todo("StateInstance tests");