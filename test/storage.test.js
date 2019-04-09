/* @flow */

import ninos            from "ninos";
import ava              from "ava";
import { Storage
       , StateInstance } from "../src/storage";
import { NONE
       , updateData
       , updateAndSend } from "../src/update";
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
  t.is(instance.getName(), "test");
  t.is(instance.getData(), initData);
  t.is(instance.getStorage(), s);
  t.deepEqual(instance.getPath(), ["test"]);
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

test.failing("States with init using updateAndSend should send messages to parent Storage", t => {
  const s             = new Storage();
  const recv1         = t.context.stub();
  const initData      = { name: "initData" };
  const initMsg       = { tag: "initMsg" };
  const init          = t.context.stub(() => updateAndSend(initData, initMsg));
  const update        = t.context.stub(() => NONE);
  // Should never receive this since messages are not self-referencing
  const subscriptions = t.context.stub(() => [subscribe("initMsg")]);
  const state         = { name: "test", init, update, subscriptions };

  s.addListener("unhandledMessage", recv1);

  const instance = s.getNestedOrCreate(state);

  t.is(init.calls.length, 1);
  t.is(recv1.calls.length, 1);
  t.is(recv1.calls[0].arguments[0], initMsg);
  t.deepEqual(recv1.calls[0].arguments[1], ["test"]);
  t.is(subscriptions.calls.length, 0);
  t.is(update.calls.length, 0);
});

test("States can be nested", t => {
  const s             = new Storage();
  const firstData     = { name: "firstData" };
  const firstDef      = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(),
    subscriptions: t.context.stub(() => []),
  };
  const secondData    = { name: "secondData" };
  const secondDef     = {
    name: "second",
    init: t.context.stub(() => updateData(secondData)),
    update: t.context.stub(),
    subscriptions: t.context.stub(() => []),
  };

  const first  = s.getNestedOrCreate(firstDef);
  const second = first.getNestedOrCreate(secondDef);

  t.is(second instanceof StateInstance, true);
  t.is(second.getName(), "second");
  t.deepEqual(second.getPath(), ["first", "second"]);
  t.is(second.getData(), secondData);
  t.is(second.getStorage(), s);
  t.is(first.getNested(firstDef), undefined);
  t.is(first.getNested(secondDef), second);
  t.is(second.getNested(firstDef), undefined);
});

test("States of the same definition can be nested", t => {
  const s             = new Storage();
  const initData      = { name: "initData" };
  const init          = t.context.stub(() => updateData(initData));
  const update        = t.context.stub(() => NONE);
  const subscriptions = t.context.stub(() => []);
  const state         = { name: "test", init, update, subscriptions };
  const first         = s.getNestedOrCreate(state);

  t.is(first.getNested(state), undefined);

  const second = first.getNestedOrCreate(state);

  t.is(second instanceof StateInstance, true);
  t.is(second.getName(), "test");
  t.deepEqual(second.getPath(), ["test", "test"]);
  t.is(second.getData(), initData);
  t.is(second.getStorage(), s);
  t.not(second, first);
});

test("StateInstance getNested throws when trying to use a new state definition with the same identifier", t => {
  const s             = new Storage();
  const initData      = { name: "initData" };
  const init          = t.context.stub(() => updateData(initData));
  const update        = t.context.stub();
  const subscriptions = t.context.stub(() => []);
  const state         = { name: "test", init, update, subscriptions };
  const state2        = { name: "test", init, update, subscriptions };
  s.registerState(state);
  const inst = s.getNestedOrCreate(state);

  t.throws(() => inst.getNested(state2), { instanceOf: Error, message: "State object mismatch for state test" });

  t.deepEqual(s.getSnapshot(), { test: { defName: "test", data: { name: "initData" }, params: undefined, nested: {} } });
  // Looking at internals
  t.deepEqual(s._nested, { test: inst });
  t.deepEqual(s._defs, { test: state });
  t.is(init.calls.length, 1)
  t.is(update.calls.length, 0);
  t.is(subscriptions.calls.length, 0);
});

test("StateInstance getNested on non-existing state instance should return undefined when using a mismatched state-definition of same name in dev-mode", t => {
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

    const inst = s.getNestedOrCreate(state);

    t.is(inst instanceof StateInstance, true);

    t.is(inst.getNested(state2), undefined);

    t.is(s.stateDefinition("test"), state);
    t.is(inst.getNested(state), undefined);
    t.deepEqual(s.getSnapshot(), { test: { defName: "test", data: { name: "initData" }, params: undefined, nested: {} } });
    t.is(init.calls.length, 1)
    t.is(update.calls.length, 0);
    t.is(subscriptions.calls.length, 0);
  }
  finally {
    process.env.NODE_ENV = nodeEnv;
  }
});

test("StateInstance init is sent to parent instances", t => {
  const s             = new Storage();
  const stub1         = t.context.stub();
  const firstData     = { name: "firstData" };
  const firstDef      = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => NONE),
    // Passive, so we should get it but also passthrough
    subscriptions: t.context.stub(() => [subscribe("secondInit", true)]),
  };
  const secondData    = { name: "secondData" };
  const secondInit    = { tag: "secondInit" };
  const secondDef     = {
    name: "second",
    init: t.context.stub(() => updateAndSend(secondData, secondInit)),
    update: t.context.stub(() => NONE),
    subscriptions: t.context.stub(() => []),
  };

  s.addListener("unhandledMessage", stub1);

  const first  = s.getNestedOrCreate(firstDef);
  const second = first.getNestedOrCreate(secondDef);

  t.is(stub1.calls.length, 1);
  t.is(stub1.calls[0].arguments[0], secondInit);
  t.deepEqual(stub1.calls[0].arguments[1], ["first", "second"]);
  t.is(firstDef.update.calls.length, 1);
  t.is(firstDef.update.calls[0].arguments[0], firstData);
  t.is(firstDef.update.calls[0].arguments[1], secondInit);
  t.is(first.getData(), firstData);
  t.deepEqual(s.getSnapshot(), {
    first:  { defName: "first",  data: { name: "firstData" },  params: undefined, nested: {
      second: { defName: "second", data: { name: "secondData" }, params: undefined, nested: {} },
    } },
  });
});

test("StateInstance init is sent to parent instances, but not siblings", t => {
  const s             = new Storage();
  const stub1         = t.context.stub();
  const firstData     = { name: "firstData" };
  const firstDef      = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => NONE),
    // Passive, so we should get it but also passthrough
    subscriptions: t.context.stub(() => [subscribe("secondInit", true)]),
  };
  const secondData    = { name: "secondData" };
  const secondInit    = { tag: "secondInit" };
  const secondDef     = {
    name: "second",
    init: t.context.stub(() => updateAndSend(secondData, secondInit)),
    update: t.context.stub(() => NONE),
    subscriptions: t.context.stub(() => []),
  };

  s.addListener("unhandledMessage", stub1);

  const first  = s.getNestedOrCreate(firstDef);
  const second = s.getNestedOrCreate(secondDef);

  t.is(stub1.calls.length, 1);
  t.is(stub1.calls[0].arguments[0], secondInit);
  t.deepEqual(stub1.calls[0].arguments[1], ["second"]);
  t.is(firstDef.update.calls.length, 0);
  t.deepEqual(s.getSnapshot(), {
    first:  { defName: "first",  data: { name: "firstData" },  params: undefined, nested: {} },
    second: { defName: "second", data: { name: "secondData" }, params: undefined, nested: {} },
  });
});

test("Messages generated during processing are handled in order", t => {
  const s             = new Storage();
  const stub1         = t.context.stub();
  const firstData     = { name: "firstData" };
  const secondData    = { name: "secondData" };
  const initMsg       = { tag: "initMsg" };
  const firstMsg      = { tag: "firstMsg" };
  const firstDef      = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(secondData, firstMsg)),
    subscriptions: t.context.stub(() => [subscribe("initMsg", true)]),
  };

  s.addListener("unhandledMessage", stub1);

  const first  = s.getNestedOrCreate(firstDef);

  first.sendMessage(initMsg);

  t.is(stub1.calls.length, 2);
  t.is(stub1.calls[0].arguments[0], initMsg);
  t.deepEqual(stub1.calls[0].arguments[1], ["first"]);
  t.is(stub1.calls[1].arguments[0], firstMsg);
  t.deepEqual(stub1.calls[1].arguments[1], ["first"]);
  t.is(firstDef.update.calls.length, 1);
  t.is(firstDef.update.calls[0].arguments[0], firstData);
  t.is(firstDef.update.calls[0].arguments[1], initMsg);
  t.is(first.getData(), secondData);
});

test("Active subscribers prevent parents and unhandledMessage from receiving", t => {
  const s             = new Storage();
  const stub1         = t.context.stub();
  const stub2         = t.context.stub();
  const stub3         = t.context.stub();
  const firstData     = { name: "firstData" };
  const initMsg       = { tag: "initMsg" };
  const firstMsg      = { tag: "firstMsg" };
  const firstDef      = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(firstData, firstMsg)),
    subscriptions: t.context.stub(() => [subscribe("initMsg")]),
  };

  s.addListener("unhandledMessage", stub1);
  s.addSubscriber(stub2, [subscribe("initMsg")]);
  s.addSubscriber(stub3, [subscribe("firstMsg")]);

  const first  = s.getNestedOrCreate(firstDef);

  first.sendMessage(initMsg);

  t.is(stub1.calls.length, 0);
  t.is(stub2.calls.length, 0);
  t.is(stub3.calls.length, 1);
  t.is(stub3.calls[0].arguments[0], firstMsg);
  t.deepEqual(stub3.calls[0].arguments[1], ["first"]);
  t.is(firstDef.update.calls.length, 1);
  t.is(firstDef.update.calls[0].arguments[0], firstData);
  t.is(firstDef.update.calls[0].arguments[1], initMsg);
  t.is(first.getData(), firstData);
});

test("Passive subscribers always receive messages from children", t => {
  const s             = new Storage();
  const stub1         = t.context.stub();
  const stub2         = t.context.stub();
  const stub3         = t.context.stub();
  const firstData     = { name: "firstData" };
  const initMsg       = { tag: "initMsg" };
  const firstMsg      = { tag: "firstMsg" };
  const firstDef      = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(firstData, firstMsg)),
    subscriptions: t.context.stub(() => [subscribe("initMsg")]),
  };

  s.addListener("unhandledMessage", stub1);
  s.addSubscriber(stub2, [subscribe("initMsg", true)]);
  s.addSubscriber(stub3, [subscribe("firstMsg", true)]);

  const first  = s.getNestedOrCreate(firstDef);

  first.sendMessage(initMsg);

  t.is(stub1.calls.length, 1);
  t.is(stub1.calls[0].arguments[0], firstMsg);
  t.deepEqual(stub1.calls[0].arguments[1], ["first"]);
  t.is(stub2.calls.length, 1);
  t.is(stub2.calls[0].arguments[0], initMsg);
  t.deepEqual(stub2.calls[0].arguments[1], ["first"]);
  t.is(stub3.calls.length, 1);
  t.is(stub3.calls[0].arguments[0], firstMsg);
  t.deepEqual(stub3.calls[0].arguments[1], ["first"]);
  t.is(firstDef.update.calls.length, 1);
  t.is(firstDef.update.calls[0].arguments[0], firstData);
  t.is(firstDef.update.calls[0].arguments[1], initMsg);
  t.is(first.getData(), firstData);
});

test.todo("Add event tests");
test.todo("Add nested message tests, internal order of processing, active/passive subscribers");