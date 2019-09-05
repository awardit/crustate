/* @flow */

import ninos from "ninos";
import ava from "ava";
import { Storage, State, findClosestSupervisor, processInstanceMessages } from "../src/storage";
import { updateData, updateAndSend } from "../src/update";

// We redefine this here so we can test it
const MESSAGE_NEW_PARAMS = "crustate/stateNewParams";

const test = ninos(ava);

test("Storage can be created without parameters and is empty", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.is(s instanceof Storage, true);
  t.is(s.getStorage(), s);
  t.deepEqual(s.getPath(), []);
  t.deepEqual(s.getSnapshot(), {});
  t.is(emit.calls.length, 0);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, {});
  t.deepEqual(s._subscribers, []);
});

test("Storage is not modified when querying for state-instances or definitions", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.is(s.getModel("foo"), undefined);
  // $ExpectError minimal State instance for this
  t.is(s.getState({ id: "foo" }), undefined);
  // $ExpectError minimal State instance for this
  t.is(s.getState({ id: "foo" }, "bar"), undefined);
  t.deepEqual(s.getSnapshot(), {});
  t.is(emit.calls.length, 0);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, {});
  t.deepEqual(s._subscribers, []);
});

test("Storage can register state definitons", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const stub1 = t.context.stub();
  const stub2 = t.context.stub();
  const stub3 = t.context.stub();
  const state = { id: "test", init: stub1, update: stub2, subscribe: stub3 };

  t.is(s.addModel(state), undefined);
  t.is(s.getModel("test"), state);
  t.is(s.getState(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  t.is(emit.calls.length, 0);
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
  const emit = t.context.spy(s, "emit");
  const stub1 = t.context.stub();
  const stub2 = t.context.stub();
  const stub3 = t.context.stub();
  const state = { id: "test", init: stub1, update: stub2, subscribe: stub3 };

  t.is(s.addModel(state), undefined);
  t.throws(() => s.addModel(state), { instanceOf: Error, message: "Duplicate model 'test'." });

  t.is(s.getModel("test"), state);
  t.is(s.getState(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  t.is(emit.calls.length, 0);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.deepEqual(stub1.calls, []);
  t.deepEqual(stub2.calls, []);
  t.deepEqual(stub3.calls, []);
});

test("Storage createState creates a new state instance", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const init = t.context.stub(() => updateData(initData));
  const update = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state = { id: "test", init, update, subscribe };
  const instance = s.createState(state);

  t.is(instance instanceof State, true);
  t.is(s.getModel("test"), state);
  t.is(s.getState(state), instance);
  t.is(s.getState(state, "bar"), undefined);
  t.deepEqual(s.getSnapshot(), { test: { id: "test", data: { name: "initData" }, params: undefined, nested: {} } });
  t.is(instance.getName(), "test");
  t.is(instance.getData(), initData);
  t.is(instance.getStorage(), s);
  t.deepEqual(instance.getPath(), ["test"]);
  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, initData]);
  // Looking at internals
  t.deepEqual(s._nested, { test: instance });
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.is(init.calls.length, 1);
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("Storage createState returns the same instance given the same params", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const init = t.context.stub(() => updateData(initData));
  const update = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state = { id: "test", init, update, subscribe };
  const instance = s.createState(state);
  const instance2 = s.createState(state);

  t.is(instance, instance2);
  t.is(init.calls.length, 1);
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
  t.deepEqual(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, initData]);
});

test.failing("Storage createState sends an update message and returns the same instance when new params are supplied", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const init = t.context.stub(() => updateData(initData));
  const update = t.context.stub((state, msg) => updateData(msg.params));
  const subscribe = t.context.stub(() => ({ [MESSAGE_NEW_PARAMS]: true }));
  const state = { id: "test", init, update, subscribe };
  const instance = s.createState(state, 1);
  const instanceEmit = t.context.spy(instance, "emit");
  const instance2 = s.createState(state, 2);

  t.is(instance, instance2);
  t.is(init.calls.length, 1);
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 1);
  t.deepEqual(init.calls[0].arguments, [initData, { tag: MESSAGE_NEW_PARAMS, params: 2 }]);
  t.is(subscribe.calls.length, 1);
  t.deepEqual(subscribe.calls[0].arguments, initData);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, initData]);
  t.deepEqual(emit.calls[1].arguments, ["stateNewData", 2, ["test"], { tag: MESSAGE_NEW_PARAMS, params: 2 }]);
  t.deepEqual(instanceEmit.calls.length, 1);
  t.deepEqual(instanceEmit.calls[1].arguments, ["stateNewData", 2, ["test"], { tag: MESSAGE_NEW_PARAMS, params: 2 }]);
});

test("Storage createState throws when trying to use a new state definition with the same identifier", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const init = t.context.stub(() => updateData(initData));
  const update = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state = { id: "test", init, update, subscribe };
  const state2 = { id: "test", init, update, subscribe };
  s.addModel(state);
  t.throws(() => s.createState(state2), { instanceOf: Error, message: "Model mismatch for 'test'." });

  t.is(s.getModel("test"), state);
  t.is(s.getState(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  t.deepEqual(emit.calls.length, 0);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.is(init.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("Storage getState on non-existing state instance should throw when using a mismatched state-definition of same id in dev-mode", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const init = t.context.stub(() => updateData(initData));
  const update = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state = { id: "test", init, update, subscribe };
  const state2 = { id: "test", init, update, subscribe };
  s.addModel(state);
  t.throws(() => s.getState(state2), { instanceOf: Error, message: "Model mismatch for 'test'." });

  t.is(s.getModel("test"), state);
  t.is(s.getState(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  t.deepEqual(emit.calls.length, 0);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.is(init.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("Storage getState on non-existing state instance should return undefined when using a mismatched state-definition of same id in dev-mode", t => {
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const s = new Storage();
    const emit = t.context.spy(s, "emit");
    const initData = { name: "initData" };
    const init = t.context.stub(() => updateData(initData));
    const update = t.context.stub();
    const subscribe = t.context.stub(() => []);
    const state = { id: "test", init, update, subscribe };
    const state2 = { id: "test", init, update, subscribe };

    s.addModel(state);
    t.is(s.getState(state2), undefined);

    t.is(s.getModel("test"), state);
    t.is(s.getState(state), undefined);
    t.deepEqual(s.getSnapshot(), {});
    t.deepEqual(emit.calls.length, 0);
    // Looking at internals
    t.deepEqual(s._nested, {});
    t.deepEqual(s._defs, { test: state });
    t.deepEqual(s._subscribers, []);
    t.is(init.calls.length, 0);
    t.is(update.calls.length, 0);
    t.is(subscribe.calls.length, 0);
  }
  finally {
    process.env.NODE_ENV = nodeEnv;
  }
});

test("Sending messages on an empty storage only results in unhandledMessage events", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const msg = { tag: "testMessage" };

  s.sendMessage(msg);

  t.deepEqual(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["$"]]);
  t.deepEqual(emit.calls[1].arguments, ["unhandledMessage", msg, ["$"]]);
});

test("Sending messages with a name Storage should use the name as source", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const msg = { tag: "testMessage" };

  s.sendMessage(msg, "mysource");

  t.deepEqual(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["mysource"]]);
  t.deepEqual(emit.calls[1].arguments, ["unhandledMessage", msg, ["mysource"]]);
});

test("Sending messages on a Storage should send them to matching subscribers", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const msg = { tag: "testMessage" };
  const msg2 = { tag: "uncaught" };

  s.addSubscriber(recv1, { "testMessage": true });
  s.addSubscriber(recv2, { "fooMessage": true });

  s.sendMessage(msg);

  t.is(recv1.calls.length, 1);
  t.deepEqual(recv1.calls[0].arguments, [msg, ["$"]]);
  t.is(recv2.calls.length, 0);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["$"]]);
  t.deepEqual(emit.calls[1].arguments, ["messageMatched", msg, [], false]);

  s.sendMessage(msg2);

  t.is(recv1.calls.length, 1);
  t.deepEqual(recv1.calls[0].arguments, [msg, ["$"]]);
  t.is(recv2.calls.length, 0);
  t.is(emit.calls.length, 4);
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", msg2, ["$"]]);
  t.deepEqual(emit.calls[3].arguments, ["unhandledMessage", msg2, ["$"]]);
});

test("Sending messages with a name on a Storage should propagate the name", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const recv1 = t.context.stub();
  const msg = { tag: "testMessage" };

  s.addSubscriber(recv1, { testMessage: true });

  s.sendMessage(msg, "themessage");

  t.is(recv1.calls.length, 1);
  t.deepEqual(recv1.calls[0].arguments, [msg, ["themessage"]]);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["themessage"]]);
  t.deepEqual(emit.calls[1].arguments, ["messageMatched", msg, [], false]);
});

test("Removing a subscriber should not fire when a matching message is sent", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const msg = { tag: "testMessage" };

  s.addSubscriber(recv1, { testMessage: true });
  s.addSubscriber(recv2, { "testMessage": true });
  s.removeSubscriber(recv2);

  s.sendMessage(msg);

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["$"]]);
  t.deepEqual(emit.calls[1].arguments, ["messageMatched", msg, [], false]);
  t.is(recv1.calls.length, 1);
  t.deepEqual(recv1.calls[0].arguments, [msg, ["$"]]);
  t.is(recv2.calls.length, 0);
});

test("Sending messages on a Storage should also trigger unhandledMessage if no active subscribers are present", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const recv = t.context.stub();
  const msg = { tag: "testMessage" };

  s.addSubscriber(recv, { "testMessage": { passive: true } });

  s.sendMessage(msg);

  t.is(recv.calls.length, 1);
  t.deepEqual(recv.calls[0].arguments, [msg, ["$"]]);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["$"]]);
  t.deepEqual(emit.calls[1].arguments, ["messageMatched", msg, [], true]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", msg, ["$"]]);
});

test("States with init using updateAndSend should send messages to parent Storage", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const initMsg = { tag: "initMsg" };
  const init = t.context.stub(() => updateAndSend(initData, initMsg));
  const update = t.context.stub(() => null);
  // Should never receive this since messages are not self-referencing
  const subscribe = t.context.stub(() => ({ "initMsg": true }));
  const state = { id: "test", init, update, subscribe };

  s.createState(state);

  t.is(init.calls.length, 1);
  t.is(subscribe.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, initData]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", initMsg, ["test"]]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", initMsg, ["test"]]);
});

test("States can be nested", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(),
    subscribe: t.context.stub(() => ({})),
  };
  const secondData = { name: "secondData" };
  const secondDef = {
    id: "second",
    init: t.context.stub(() => updateData(secondData)),
    update: t.context.stub(),
    subscribe: t.context.stub(() => ({})),
  };

  const first = s.createState(firstDef);
  const second = first.createState(secondDef);

  t.is(second instanceof State, true);
  t.is(second.getName(), "second");
  t.deepEqual(second.getPath(), ["first", "second"]);
  t.is(second.getData(), secondData);
  t.is(second.getStorage(), s);
  t.is(first.getState(firstDef), undefined);
  t.is(first.getState(secondDef), second);
  t.is(second.getState(firstDef), undefined);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["first", "second"], undefined, { name: "secondData" }]);
});

test("States of the same definition can be nested", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const init = t.context.stub(() => updateData(initData));
  const update = t.context.stub(() => null);
  const subscribe = t.context.stub(() => ({}));
  const state = { id: "test", init, update, subscribe };
  const first = s.createState(state);

  t.is(first.getState(state), undefined);

  const second = first.createState(state);

  t.is(second instanceof State, true);
  t.is(second.getName(), "test");
  t.deepEqual(second.getPath(), ["test", "test"]);
  t.is(second.getData(), initData);
  t.is(second.getStorage(), s);
  t.not(second, first);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, { name: "initData" }]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["test", "test"], undefined, { name: "initData" }]);
});

test("State getState throws when trying to use a new state definition with the same identifier", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const init = t.context.stub(() => updateData(initData));
  const update = t.context.stub();
  const subscribe = t.context.stub(() => ({}));
  const state = { id: "test", init, update, subscribe };
  const state2 = { id: "test", init, update, subscribe };
  s.addModel(state);
  const inst = s.createState(state);

  t.throws(() => inst.getState(state2), { instanceOf: Error, message: "Model mismatch for 'test'." });

  t.deepEqual(s.getSnapshot(), { test: { id: "test", data: { name: "initData" }, params: undefined, nested: {} } });
  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, { name: "initData" }]);
  // Looking at internals
  t.deepEqual(s._nested, { test: inst });
  t.deepEqual(s._defs, { test: state });
  t.is(init.calls.length, 1);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("State getState on non-existing state instance should return undefined when using a mismatched state-definition of same id in dev-mode", t => {
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const s = new Storage();
    const emit = t.context.spy(s, "emit");
    const initData = { name: "initData" };
    const init = t.context.stub(() => updateData(initData));
    const update = t.context.stub();
    const subscribe = t.context.stub(() => ({}));
    const state = { id: "test", init, update, subscribe };
    const state2 = { id: "test", init, update, subscribe };

    s.addModel(state);

    const inst = s.createState(state);

    t.is(inst instanceof State, true);

    t.is(inst.getState(state2), undefined);

    t.is(s.getModel("test"), state);
    t.is(inst.getState(state), undefined);
    t.deepEqual(s.getSnapshot(), { test: { id: "test", data: { name: "initData" }, params: undefined, nested: {} } });
    t.is(init.calls.length, 1);
    t.is(update.calls.length, 0);
    t.is(subscribe.calls.length, 0);
    t.is(emit.calls.length, 1);
    t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, { name: "initData" }]);
  }
  finally {
    process.env.NODE_ENV = nodeEnv;
  }
});

test("Messages sent on State should propagate upwards", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const initMsg = { tag: "initMsg" };
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };

  const first = s.createState(firstDef);

  first.sendMessage(initMsg);

  t.is(firstDef.update.calls.length, 0);
  t.is(first.getData(), firstData);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "initMsg" }, ["first", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", { tag: "initMsg" }, ["first", "$"]]);
});

test("Messages with a sourceName sent on State should propagate upwards with that name", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const initMsg = { tag: "initMsg" };
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };

  const first = s.createState(firstDef);

  first.sendMessage(initMsg, "thesource");

  t.is(firstDef.update.calls.length, 0);
  t.is(first.getData(), firstData);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "initMsg" }, ["first", "thesource"]]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", { tag: "initMsg" }, ["first", "thesource"]]);
});

test("State init is sent to parent instances", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => null),
    // Passive, so we should get it but also passthrough
    subscribe: t.context.stub(() => ({ "secondInit": { passive: true } })),
  };
  const secondData = { name: "secondData" };
  const secondInit = { tag: "secondInit" };
  const secondDef = {
    id: "second",
    init: t.context.stub(() => updateAndSend(secondData, secondInit)),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };

  const first = s.createState(firstDef);
  first.createState(secondDef);

  t.is(firstDef.update.calls.length, 1);
  t.deepEqual(firstDef.update.calls[0].arguments, [firstData, secondInit]);
  t.is(first.getData(), firstData);
  t.deepEqual(s.getSnapshot(), {
    first: { id: "first", data: { name: "firstData" }, params: undefined, nested: {
      second: { id: "second", data: { name: "secondData" }, params: undefined, nested: {} },
    } },
  });
  t.is(emit.calls.length, 5);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["first", "second"], undefined, { name: "secondData" }]);
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", secondInit, ["first", "second"]]);
  t.deepEqual(emit.calls[3].arguments, ["messageMatched", secondInit, ["first"], true]);
  t.deepEqual(emit.calls[4].arguments, ["unhandledMessage", secondInit, ["first", "second"]]);
});

test("no message matches on nested states", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    // Passive, so we should get it but also passthrough
    subscribe: t.context.stub(() => ({ "never": true })),
  };

  const f = s.createState(firstDef);

  f.sendMessage({ tag: "nomatch" });
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, {}]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "nomatch" }, ["first", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", { tag: "nomatch" }, ["first", "$"]]);
});

test("State init is sent to parent instances, but not siblings", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => null),
    // Passive, so we should get it but also passthrough
    subscribe: t.context.stub(() => ({ "secondInit": { passive: true } })),
  };
  const secondData = { name: "secondData" };
  const secondInit = { tag: "secondInit" };
  const secondDef = {
    id: "second",
    init: t.context.stub(() => updateAndSend(secondData, secondInit)),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };

  s.createState(firstDef);
  s.createState(secondDef);

  t.is(firstDef.update.calls.length, 0);
  t.deepEqual(s.getSnapshot(), {
    first: { id: "first", data: { name: "firstData" }, params: undefined, nested: {} },
    second: { id: "second", data: { name: "secondData" }, params: undefined, nested: {} },
  });
  t.is(emit.calls.length, 4);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["second"], undefined, { name: "secondData" }]);
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", secondInit, ["second"]]);
  t.deepEqual(emit.calls[3].arguments, ["unhandledMessage", secondInit, ["second"]]);
});

test("Messages generated during processing are handled in order", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const secondData = { name: "secondData" };
  const initMsg = { tag: "initMsg" };
  const firstMsg = { tag: "firstMsg" };
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(secondData, firstMsg)),
    subscribe: t.context.stub(() => ({ "initMsg": { passive: true } })),
  };

  const first = s.createState(firstDef);

  first.sendMessage(initMsg);

  t.is(firstDef.update.calls.length, 1);
  t.deepEqual(firstDef.update.calls[0].arguments, [firstData, initMsg]);
  t.is(first.getData(), secondData);
  t.is(emit.calls.length, 7);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", initMsg, ["first", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["messageMatched", initMsg, ["first"], true]);
  t.deepEqual(emit.calls[3].arguments, ["stateNewData", secondData, ["first"], initMsg]);
  t.deepEqual(emit.calls[4].arguments, ["messageQueued", firstMsg, ["first"]]);
  t.deepEqual(emit.calls[5].arguments, ["unhandledMessage", initMsg, ["first", "$"]]);
  t.deepEqual(emit.calls[6].arguments, ["unhandledMessage", firstMsg, ["first"]]);
});

test("Active subscribers prevent parents and unhandledMessage from receiving", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const stub1 = t.context.stub();
  const stub2 = t.context.stub();
  const firstData = { name: "firstData" };
  const initMsg = { tag: "initMsg" };
  const firstMsg = { tag: "firstMsg" };
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(firstData, firstMsg)),
    subscribe: t.context.stub(() => ({ "initMsg": true })),
  };

  s.addSubscriber(stub1, { "initMsg": true });
  s.addSubscriber(stub2, { "firstMsg": true });

  const first = s.createState(firstDef);

  first.sendMessage(initMsg);

  t.is(stub1.calls.length, 0);
  t.is(stub2.calls.length, 1);
  t.deepEqual(stub2.calls[0].arguments, [firstMsg, ["first"]]);
  t.is(firstDef.update.calls.length, 1);
  t.deepEqual(firstDef.update.calls[0].arguments, [firstData, initMsg]);
  t.is(first.getData(), firstData);
  t.is(emit.calls.length, 6);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "initMsg" }, ["first", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["messageMatched", { tag: "initMsg" }, ["first"], false]);
  t.deepEqual(emit.calls[3].arguments, ["stateNewData", { name: "firstData" }, ["first"], { tag: "initMsg" }]);
  t.deepEqual(emit.calls[4].arguments, ["messageQueued", { tag: "firstMsg" }, ["first"]]);
  t.deepEqual(emit.calls[5].arguments, ["messageMatched", { tag: "firstMsg" }, [], false]);
});

test("Passive subscribers always receive messages from children", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const stub1 = t.context.stub();
  const stub2 = t.context.stub();
  const firstData = { name: "firstData" };
  const initMsg = { tag: "initMsg" };
  const firstMsg = { tag: "firstMsg" };
  const firstDef = {
    id: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(firstData, firstMsg)),
    subscribe: t.context.stub(() => ({ "initMsg": true })),
  };

  s.addSubscriber(stub1, { "initMsg": { passive: true } });
  s.addSubscriber(stub2, { "firstMsg": { passive: true } });

  const first = s.createState(firstDef);

  first.sendMessage(initMsg);

  t.is(stub1.calls.length, 1);
  t.deepEqual(stub1.calls[0].arguments, [initMsg, ["first", "$"]]);
  t.is(stub2.calls.length, 1);
  t.deepEqual(stub2.calls[0].arguments, [firstMsg, ["first"]]);
  t.is(firstDef.update.calls.length, 1);
  t.deepEqual(firstDef.update.calls[0].arguments, [firstData, initMsg]);
  t.is(first.getData(), firstData);

  t.is(emit.calls.length, 8);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "initMsg" }, ["first", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["messageMatched", { tag: "initMsg" }, ["first"], false]);
  t.deepEqual(emit.calls[3].arguments, ["stateNewData", { name: "firstData" }, ["first"], { tag: "initMsg" }]);
  t.deepEqual(emit.calls[4].arguments, ["messageQueued", { tag: "firstMsg" }, ["first"]]);
  t.deepEqual(emit.calls[5].arguments, ["messageMatched", { tag: "initMsg" }, [], true]);
  t.deepEqual(emit.calls[6].arguments, ["messageMatched", { tag: "firstMsg" }, [], true]);
  t.deepEqual(emit.calls[7].arguments, ["unhandledMessage", { tag: "firstMsg" }, ["first"]]);
});

test("findClosestSupervisor", t => {
  const defA = {
    id: "a",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };
  const defB = {
    id: "b",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };
  const s = new Storage();

  const sA = s.createState(defA);
  const sAB = s.createState(defA).createState(defB);
  const sAA = s.createState(defA).createState(defA);
  const sB = s.createState(defB);
  const sBA = s.createState(defB).createState(defA);
  const sBB = s.createState(defB).createState(defB);

  t.is(findClosestSupervisor(s, []), s);
  t.is(findClosestSupervisor(s, ["a"]), sA);
  t.is(findClosestSupervisor(s, ["a", "c"]), sA);
  t.is(findClosestSupervisor(s, ["a", "b"]), sAB);
  t.is(findClosestSupervisor(s, ["a", "b", "c"]), sAB);
  t.is(findClosestSupervisor(s, ["a", "a"]), sAA);
  t.is(findClosestSupervisor(s, ["a", "a", "c"]), sAA);
  t.is(findClosestSupervisor(s, ["b"]), sB);
  t.is(findClosestSupervisor(s, ["b", "c"]), sB);
  t.is(findClosestSupervisor(s, ["b", "a"]), sBA);
  t.is(findClosestSupervisor(s, ["b", "a", "c"]), sBA);
  t.is(findClosestSupervisor(s, ["b", "b"]), sBB);
  t.is(findClosestSupervisor(s, ["b", "b", "c"]), sBB);
  t.is(findClosestSupervisor(s, ["c"]), s);
  t.is(findClosestSupervisor(s, ["c", "d"]), s);
});

test("Storage.replyMessage", t => {
  const defA = {
    id: "a",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };
  const defB = {
    id: "b",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };
  const s = new Storage();
  const msgA = { tag: "A" };
  const msgB = { tag: "B" };

  s.createState(defA).createState(defB);

  const emit = t.context.spy(s, "emit");

  s.replyMessage(msgA, []);
  s.replyMessage(msgA, ["a"]);
  s.replyMessage(msgB, ["a", "b"]);
  s.replyMessage(msgB, ["a", "b"], "outside");
  s.replyMessage(msgA, ["foo", "bar"]);
  s.replyMessage(msgA, ["foo", "bar"], "another");

  t.is(emit.calls.length, 12);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", { tag: "A" }, ["<"]]);
  t.deepEqual(emit.calls[1].arguments, ["unhandledMessage", { tag: "A" }, ["<"]]);
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", { tag: "A" }, ["a", "<"]]);
  t.deepEqual(emit.calls[3].arguments, ["unhandledMessage", { tag: "A" }, ["a", "<"]]);
  t.deepEqual(emit.calls[4].arguments, ["messageQueued", { tag: "B" }, ["a", "b", "<"]]);
  t.deepEqual(emit.calls[5].arguments, ["unhandledMessage", { tag: "B" }, ["a", "b", "<"]]);
  t.deepEqual(emit.calls[6].arguments, ["messageQueued", { tag: "B" }, ["a", "b", "outside"]]);
  t.deepEqual(emit.calls[7].arguments, ["unhandledMessage", { tag: "B" }, ["a", "b", "outside"]]);
  t.deepEqual(emit.calls[8].arguments, ["messageQueued", { tag: "A" }, ["foo", "bar", "<"]]);
  t.deepEqual(emit.calls[9].arguments, ["unhandledMessage", { tag: "A" }, ["foo", "bar", "<"]]);
  t.deepEqual(emit.calls[10].arguments, ["messageQueued", { tag: "A" }, ["foo", "bar", "another"]]);
  t.deepEqual(emit.calls[11].arguments, ["unhandledMessage", { tag: "A" }, ["foo", "bar", "another"]]);
});

test("Storage.removeState", t => {
  const s = new Storage();
  const defA = {
    id: "a",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };
  const defB = {
    id: "b",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };
  const emit = t.context.spy(s, "emit");

  t.is(s.getState(defA), undefined);
  t.is(s.removeState(defA), undefined);
  t.is(emit.calls.length, 0);
  t.is(s.removeState(defB), undefined);
  t.is(emit.calls.length, 0);
  t.is(s.getState(defA), undefined);

  const a = s.createState(defA);

  t.is(a instanceof State, true);
  t.is(s.getState(defA), a);
  t.is(s.removeState(defB), undefined);
  t.is(s.getState(defA), a);
  t.is(s.removeState(defA), undefined);
  t.is(s.getState(defA), undefined);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], undefined, {}]);
  t.deepEqual(emit.calls[1].arguments, ["stateRemoved", ["a"], {}]);
});

test("State.removeState", t => {
  const s = new Storage();
  const defA = {
    id: "a",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };
  const defB = {
    id: "b",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => null),
    subscribe: t.context.stub(() => ({})),
  };
  const emit = t.context.spy(s, "emit");
  const a = s.createState(defA);
  const emitA = t.context.spy(a, "emit");

  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], undefined, {}]);
  t.is(a.getState(defA), undefined);
  t.is(a.removeState(defA), undefined);
  t.is(emit.calls.length, 1);
  t.is(a.removeState(defB), undefined);
  t.is(emit.calls.length, 1);
  t.is(a.getState(defA), undefined);

  const i = a.createState(defA);

  t.is(i instanceof State, true);
  t.is(a.getState(defA), i);
  t.is(a.removeState(defB), undefined);
  t.is(a.getState(defA), i);
  t.is(a.removeState(defA), undefined);
  t.is(i.getState(defA), undefined);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], undefined, {}]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["a", "a"], undefined, {}]);
  t.deepEqual(emit.calls[2].arguments, ["stateRemoved", ["a", "a"], {}]);
  t.is(emitA.calls.length, 0);
});

test("Storage updates subscribe during processing when state data is updated", t => {
  const s = new Storage();
  const def = {
    id: "a",
    init: t.context.stub(() => updateData(false)),
    update: t.context.stub(() => updateData(true)),
    subscribe: t.context.stub(s => s ? { b: true } : { a: true }),
  };

  const emit = t.context.spy(s, "emit");
  const i = s.createState(def);

  processInstanceMessages(s, i, [
    { _message: { tag: "b", __no: true }, _source: ["a", "test"], _received: false },
    { _message: { tag: "a", __yes: true }, _source: ["a", "test"], _received: false },
    { _message: { tag: "b", __yes: true }, _source: ["a", "test"], _received: false },
    { _message: { tag: "a", __no: true }, _source: ["a", "test"], _received: false },
  ]);

  t.is(emit.calls.length, 7);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], undefined, false]);
  t.deepEqual(emit.calls[1].arguments, ["messageMatched", { tag: "a", __yes: true }, ["a"], false]);
  t.deepEqual(emit.calls[2].arguments, ["stateNewData", true, ["a"], { tag: "a", __yes: true }]);
  t.deepEqual(emit.calls[3].arguments, ["messageMatched", { tag: "b", __yes: true }, ["a"], false]);
  t.deepEqual(emit.calls[4].arguments, ["stateNewData", true, ["a"], { tag: "b", __yes: true }]);
  t.deepEqual(emit.calls[5].arguments, ["unhandledMessage", { tag: "b", __no: true }, ["a", "test"]]);
  t.deepEqual(emit.calls[6].arguments, ["unhandledMessage", { tag: "a", __no: true }, ["a", "test"]]);
});

test("restoreSnapshot throws if it cannot find a matching state definition", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.throws(() => s.restoreSnapshot({ foo: { id: "bar", data: null, params: null, nested: {} } }), { message: "Missing model for state 'bar'." });

  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", { foo: { id: "bar", data: null, params: null, nested: {} } }]);
});

test("restoreSnapshot works on empty", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ });

  t.deepEqual(s.getSnapshot(), { });

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", {}]);
  t.deepEqual(emit.calls[1].arguments, ["snapshotRestored"]);
});

test("restoreSnapshot restores a snapshot", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  s.addModel(d);

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ foo: { id: "foo", data: 3, params: 23, nested: {} } });

  t.deepEqual(s.getSnapshot(), { foo: { id: "foo", data: 3, params: 23, nested: {} } });

  t.not(s.getState(d), undefined);
  t.deepEqual((s.getState(d): any).getData(), 3);

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", { foo: { id: "foo", data: 3, params: 23, nested: {} } }]);
  t.deepEqual(emit.calls[1].arguments, ["snapshotRestored"]);
  t.is(init.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("restoreSnapshot restores a snapshot with a differing name", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    id: "bar",
    init,
    update,
    subscribe,
  };

  s.addModel(d);

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ foo: { id: "bar", data: 3, params: 23, nested: {} } });

  t.deepEqual(s.getSnapshot(), { foo: { id: "bar", data: 3, params: 23, nested: {} } });

  t.not(s.getState(d, "foo"), undefined);

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", { foo: { id: "bar", data: 3, params: 23, nested: {} } }]);
  t.deepEqual(emit.calls[1].arguments, ["snapshotRestored"]);
  t.is(init.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("restoreSnapshot restores nested snapshots", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  s.addModel(d);

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ foo: { id: "foo", data: 3, params: 23, nested: { foo: { id: "foo", data: 5, params: 2, nested: {} } } } });

  t.deepEqual(s.getSnapshot(), { foo: { id: "foo", data: 3, params: 23, nested: { foo: { id: "foo", data: 5, params: 2, nested: {} } } } });

  t.not(s.getState(d), undefined);
  t.deepEqual((s.getState(d): any).getData(), 3);
  t.not((s.getState(d): any).getState(d), undefined);
  t.deepEqual(((s.getState(d): any).getState(d): any).getData(), 5);

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", { foo: { id: "foo", data: 3, params: 23, nested: { foo: { id: "foo", data: 5, params: 2, nested: {} } } } }]);
  t.deepEqual(emit.calls[1].arguments, ["snapshotRestored"]);
  t.is(init.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("Storage getState, createState, and removeState, with a different name should not affect the existing", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  t.is(s.getState(d), undefined);
  t.is(s.getState(d, "foo"), undefined);
  t.is(s.getState(d, "bar"), undefined);
  t.not(s.createState(d), undefined);

  t.deepEqual(s.getSnapshot(), { foo: { id: "foo", data: 1, params: undefined, nested: {} } });

  t.not(s.getState(d), undefined);
  t.is(s.getState(d), s.getState(d, "foo"));
  t.is(s.createState(d), s.createState(d, undefined, "foo"));
  t.is(s.getState(d), s.getState(d, "foo"));
  t.is(s.getState(d, "bar"), undefined);
  t.not(s.createState(d, null, "bar"), undefined);

  t.deepEqual(s.getSnapshot(), {
    foo: { id: "foo", data: 1, params: undefined, nested: {} },
    bar: { id: "foo", data: 1, params: null, nested: {} },
  });

  const sFoo = s.createState(d, undefined, "foo");
  const sBar = s.createState(d, null, "bar");

  t.not(sFoo, undefined);
  t.not(sBar, undefined);
  t.not(sFoo, sBar);

  t.is(sFoo.getName(), "foo");
  t.deepEqual(sFoo.getPath(), ["foo"]);
  t.is(sFoo.getStorage(), s);
  t.is(sBar.getName(), "bar");
  t.deepEqual(sBar.getPath(), ["bar"]);
  t.is(sBar.getStorage(), s);

  s.removeState(d);

  t.deepEqual(s.getSnapshot(), {
    bar: { id: "foo", data: 1, params: null, nested: {} },
  });

  t.not(s.createState(d, null, "baz"), undefined);

  t.deepEqual(s.getSnapshot(), {
    bar: { id: "foo", data: 1, params: null, nested: {} },
    baz: { id: "foo", data: 1, params: null, nested: {} },
  });

  t.is(s.getState(d), undefined);
  t.is(s.getState(d, "foo"), undefined);
  t.not(s.getState(d, "bar"), undefined);
  t.not(s.getState(d, "baz"), undefined);

  s.removeState(d);

  t.deepEqual(s.getSnapshot(), {
    bar: { id: "foo", data: 1, params: null, nested: {} },
    baz: { id: "foo", data: 1, params: null, nested: {} },
  });

  s.removeState(d, "bar");

  t.deepEqual(s.getSnapshot(), {
    baz: { id: "foo", data: 1, params: null, nested: {} },
  });

  t.not(s.createState(d), undefined);

  t.deepEqual(s.getSnapshot(), {
    foo: { id: "foo", data: 1, params: undefined, nested: {} },
    baz: { id: "foo", data: 1, params: null, nested: {} },
  });

  s.removeState(d, "foo");

  t.deepEqual(s.getSnapshot(), {
    baz: { id: "foo", data: 1, params: null, nested: {} },
  });

  t.is(emit.calls.length, 7);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["foo"], undefined, 1]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["bar"], null, 1]);
  t.deepEqual(emit.calls[2].arguments, ["stateRemoved", ["foo"], 1]);
  t.deepEqual(emit.calls[3].arguments, ["stateCreated", ["baz"], null, 1]);
  t.deepEqual(emit.calls[4].arguments, ["stateRemoved", ["bar"], 1]);
  t.deepEqual(emit.calls[5].arguments, ["stateCreated", ["foo"], undefined, 1]);
  t.deepEqual(emit.calls[6].arguments, ["stateRemoved", ["foo"], 1]);
  t.is(init.calls.length, 4);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("State getState, createState, and removeState, with a different name should not affect the existing", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  const nested = s.createState(d, undefined, "bar");

  t.is(nested.getState(d), undefined);
  t.is(nested.getState(d, "foo"), undefined);
  t.is(nested.getState(d, "bar"), undefined);
  t.not(nested.createState(d), undefined);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, params: undefined, nested: {
    foo: { id: "foo", data: 1, params: undefined, nested: {} },
  } } });

  t.not(nested.getState(d), undefined);
  t.not(nested.getState(d), s.getState(d));
  t.is(nested.getState(d), nested.getState(d, "foo"));
  t.is(nested.createState(d), nested.createState(d, undefined, "foo"));
  t.is(nested.getState(d), nested.getState(d, "foo"));
  t.is(nested.getState(d, "bar"), undefined);
  t.not(nested.createState(d, null, "bar"), undefined);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, params: undefined, nested: {
    foo: { id: "foo", data: 1, params: undefined, nested: {} },
    bar: { id: "foo", data: 1, params: null, nested: {} },
  } } });

  const sFoo = nested.createState(d, undefined, "foo");
  const sBar = nested.createState(d, null, "bar");

  t.not(sFoo, undefined);
  t.not(sBar, undefined);
  t.not(sFoo, sBar);

  t.is(sFoo.getName(), "foo");
  t.deepEqual(sFoo.getPath(), ["bar", "foo"]);
  t.is(sFoo.getStorage(), s);
  t.is(sBar.getName(), "bar");
  t.deepEqual(sBar.getPath(), ["bar", "bar"]);
  t.is(sBar.getStorage(), s);

  nested.removeState(d);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, params: undefined, nested: {
    bar: { id: "foo", data: 1, params: null, nested: {} },
  } } });

  t.not(nested.createState(d, null, "baz"), undefined);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, params: undefined, nested: {
    bar: { id: "foo", data: 1, params: null, nested: {} },
    baz: { id: "foo", data: 1, params: null, nested: {} },
  } } });

  t.is(nested.getState(d), undefined);
  t.is(nested.getState(d, "foo"), undefined);
  t.not(nested.getState(d, "bar"), undefined);
  t.not(nested.getState(d, "baz"), undefined);

  nested.removeState(d);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, params: undefined, nested: {
    bar: { id: "foo", data: 1, params: null, nested: {} },
    baz: { id: "foo", data: 1, params: null, nested: {} },
  } } });

  nested.removeState(d, "bar");

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, params: undefined, nested: {
    baz: { id: "foo", data: 1, params: null, nested: {} },
  } } });

  t.not(nested.createState(d), undefined);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, params: undefined, nested: {
    foo: { id: "foo", data: 1, params: undefined, nested: {} },
    baz: { id: "foo", data: 1, params: null, nested: {} },
  } } });

  nested.removeState(d, "foo");

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, params: undefined, nested: {
    baz: { id: "foo", data: 1, params: null, nested: {} },
  } } });

  t.is(emit.calls.length, 8);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["bar"], undefined, 1]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["bar", "foo"], undefined, 1]);
  t.deepEqual(emit.calls[2].arguments, ["stateCreated", ["bar", "bar"], null, 1]);
  t.deepEqual(emit.calls[3].arguments, ["stateRemoved", ["bar", "foo"], 1]);
  t.deepEqual(emit.calls[4].arguments, ["stateCreated", ["bar", "baz"], null, 1]);
  t.deepEqual(emit.calls[5].arguments, ["stateRemoved", ["bar", "bar"], 1]);
  t.deepEqual(emit.calls[6].arguments, ["stateCreated", ["bar", "foo"], undefined, 1]);
  t.deepEqual(emit.calls[7].arguments, ["stateRemoved", ["bar", "foo"], 1]);
  t.is(init.calls.length, 5);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("createState with a different name should still work to send messages", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  const nested = s.createState(d, undefined, "bar");

  const sFoo = nested.createState(d);
  const sBar = nested.createState(d, null, "bar");

  sFoo.sendMessage({ tag: "AAA", testing: "foo" });
  sBar.sendMessage({ tag: "AAA", testing: "bar" });

  t.is(emit.calls.length, 7);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["bar"], undefined, 1]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["bar", "foo"], undefined, 1]);
  t.deepEqual(emit.calls[2].arguments, ["stateCreated", ["bar", "bar"], null, 1]);
  t.deepEqual(emit.calls[3].arguments, ["messageQueued", { tag: "AAA", testing: "foo" }, ["bar", "foo", "$"]]);
  t.deepEqual(emit.calls[4].arguments, ["unhandledMessage", { tag: "AAA", testing: "foo" }, ["bar", "foo", "$"]]);
  t.deepEqual(emit.calls[5].arguments, ["messageQueued", { tag: "AAA", testing: "bar" }, ["bar", "bar", "$"]]);
  t.deepEqual(emit.calls[6].arguments, ["unhandledMessage", { tag: "AAA", testing: "bar" }, ["bar", "bar", "$"]]);
  t.is(init.calls.length, 3);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 4);
});

test("broadcastMessage triggers unhandledMessage on empty", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.is(s.broadcastMessage({ tag: "AAA" }), undefined);

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", { tag: "AAA" }, ["@"]]);
  t.deepEqual(emit.calls[1].arguments, ["unhandledMessage", { tag: "AAA" }, ["@"]]);
});

test("broadcastMessage triggers attempts to send messages to all states", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  const foo = s.createState(d);
  foo.createState(d, undefined, "bar");

  t.is(s.broadcastMessage({ tag: "AAA" }), undefined);

  t.is(emit.calls.length, 4);
  t.deepEqual(emit.calls[0].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[1].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", { tag: "AAA" }, ["@"]]);
  t.deepEqual(emit.calls[3].arguments, ["unhandledMessage", { tag: "AAA" }, ["@"]]);
  t.is(subscribe.calls.length, 2);
  t.deepEqual(subscribe.calls[0].arguments, [1]);
  t.deepEqual(subscribe.calls[1].arguments, [1]);
  t.is(update.calls.length, 0);
});

test("broadcastMessage sends a message to all states with deepest first", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({ AAA: true }));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  const foo = s.createState(d);
  foo.createState(d);
  foo.createState(d, undefined, "bar");

  t.is(s.broadcastMessage({ tag: "AAA" }), undefined);

  t.is(emit.calls.length, 10);
  t.deepEqual(emit.calls[0].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[1].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[2].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[3].arguments, ["messageQueued", { tag: "AAA" }, ["@"]]);
  t.deepEqual(emit.calls[4].arguments, ["messageMatched", { tag: "AAA" }, ["foo", "foo"], false]);
  t.deepEqual(emit.calls[5].arguments, ["stateNewData", 2, ["foo", "foo"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[6].arguments, ["messageMatched", { tag: "AAA" }, ["foo", "bar"], false]);
  t.deepEqual(emit.calls[7].arguments, ["stateNewData", 2, ["foo", "bar"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[8].arguments, ["messageMatched", { tag: "AAA" }, ["foo"], false]);
  t.deepEqual(emit.calls[9].arguments, ["stateNewData", 2, ["foo"], { tag: "AAA" }]);
  t.is(subscribe.calls.length, 6);
  t.deepEqual(subscribe.calls[0].arguments, [1]);
  t.deepEqual(subscribe.calls[1].arguments, [2]);
  t.deepEqual(subscribe.calls[2].arguments, [1]);
  t.deepEqual(subscribe.calls[3].arguments, [2]);
  t.deepEqual(subscribe.calls[4].arguments, [1]);
  t.deepEqual(subscribe.calls[5].arguments, [2]);
  t.is(update.calls.length, 3);
});

test("broadcastMessage will still trigger unhandledMessage if only passive subscribers are used", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({ AAA: { passive: true } }));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  const foo = s.createState(d);
  foo.createState(d);
  foo.createState(d, undefined, "bar");

  t.is(s.broadcastMessage({ tag: "AAA" }), undefined);

  t.is(emit.calls.length, 11);
  t.deepEqual(emit.calls[0].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[1].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[2].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[3].arguments, ["messageQueued", { tag: "AAA" }, ["@"]]);
  t.deepEqual(emit.calls[4].arguments, ["messageMatched", { tag: "AAA" }, ["foo", "foo"], true]);
  t.deepEqual(emit.calls[5].arguments, ["stateNewData", 2, ["foo", "foo"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[6].arguments, ["messageMatched", { tag: "AAA" }, ["foo", "bar"], true]);
  t.deepEqual(emit.calls[7].arguments, ["stateNewData", 2, ["foo", "bar"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[8].arguments, ["messageMatched", { tag: "AAA" }, ["foo"], true]);
  t.deepEqual(emit.calls[9].arguments, ["stateNewData", 2, ["foo"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[10].arguments, ["unhandledMessage", { tag: "AAA" }, ["@"]]);
  t.is(subscribe.calls.length, 6);
  t.deepEqual(subscribe.calls[0].arguments, [1]);
  t.deepEqual(subscribe.calls[1].arguments, [2]);
  t.deepEqual(subscribe.calls[2].arguments, [1]);
  t.deepEqual(subscribe.calls[3].arguments, [2]);
  t.deepEqual(subscribe.calls[4].arguments, [1]);
  t.deepEqual(subscribe.calls[5].arguments, [2]);
  t.is(update.calls.length, 3);
});

test("broadcastMessage will not trigger unhandledMessage if at least one is a non-passive subscriber", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({ AAA: { passive: true } }));
  const subscribe2 = t.context.stub(() => ({ AAA: true }));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };
  const d2 = {
    id: "bar",
    init,
    update,
    subscribe: subscribe2,
  };

  s.createState(d);
  s.createState(d2);

  t.is(s.broadcastMessage({ tag: "AAA" }), undefined);

  t.is(emit.calls.length, 7);
  t.deepEqual(emit.calls[0].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[1].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", { tag: "AAA" }, ["@"]]);
  t.deepEqual(emit.calls[3].arguments, ["messageMatched", { tag: "AAA" }, ["foo"], true]);
  t.deepEqual(emit.calls[4].arguments, ["stateNewData", 2, ["foo"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[5].arguments, ["messageMatched", { tag: "AAA" }, ["bar"], false]);
  t.deepEqual(emit.calls[6].arguments, ["stateNewData", 2, ["bar"], { tag: "AAA" }]);
  t.is(subscribe.calls.length, 2);
  t.deepEqual(subscribe.calls[0].arguments, [1]);
  t.deepEqual(subscribe.calls[1].arguments, [2]);
  t.is(subscribe2.calls.length, 2);
  t.deepEqual(subscribe2.calls[0].arguments, [1]);
  t.deepEqual(subscribe2.calls[1].arguments, [2]);
  t.is(update.calls.length, 2);
});

test("broadcastMessage will not trigger unhandledMessage if at least one is a non-passive subscriber, nested variant", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({ AAA: { passive: true } }));
  const subscribe2 = t.context.stub(() => ({ AAA: true }));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };
  const d2 = {
    id: "bar",
    init,
    update,
    subscribe: subscribe2,
  };

  const foo = s.createState(d);
  foo.createState(d2);

  t.is(s.broadcastMessage({ tag: "AAA" }), undefined);

  t.is(emit.calls.length, 7);
  t.deepEqual(emit.calls[0].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[1].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", { tag: "AAA" }, ["@"]]);
  t.deepEqual(emit.calls[3].arguments, ["messageMatched", { tag: "AAA" }, ["foo", "bar"], false]);
  t.deepEqual(emit.calls[4].arguments, ["stateNewData", 2, ["foo", "bar"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[5].arguments, ["messageMatched", { tag: "AAA" }, ["foo"], true]);
  t.deepEqual(emit.calls[6].arguments, ["stateNewData", 2, ["foo"], { tag: "AAA" }]);
  t.is(subscribe.calls.length, 2);
  t.deepEqual(subscribe.calls[0].arguments, [1]);
  t.deepEqual(subscribe.calls[1].arguments, [2]);
  t.is(subscribe2.calls.length, 2);
  t.deepEqual(subscribe2.calls[0].arguments, [1]);
  t.deepEqual(subscribe2.calls[1].arguments, [2]);
  t.is(update.calls.length, 2);
});

test("broadcastMessage propagates messages in order", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData(1));
  const update = t.context.stub(() => updateAndSend(2, { tag: "BBB" }));
  const subscribe = t.context.stub(() => ({ AAA: true, BBB: true }));
  const d = {
    id: "foo",
    init,
    update,
    subscribe,
  };

  const foo = s.createState(d);
  foo.createState(d);
  foo.createState(d, undefined, "bar");

  t.is(s.broadcastMessage({ tag: "AAA" }), undefined);

  t.is(emit.calls.length, 22);
  t.deepEqual(emit.calls[0].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[1].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[2].arguments[0], "stateCreated");
  t.deepEqual(emit.calls[3].arguments, ["messageQueued", { tag: "AAA" }, ["@"]]);
  t.deepEqual(emit.calls[4].arguments, ["messageMatched", { tag: "AAA" }, ["foo", "foo"], false]);
  t.deepEqual(emit.calls[5].arguments, ["stateNewData", 2, ["foo", "foo"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[6].arguments, ["messageQueued", { tag: "BBB" }, ["foo", "foo"]]);
  t.deepEqual(emit.calls[7].arguments, ["messageMatched", { tag: "AAA" }, ["foo", "bar"], false]);
  t.deepEqual(emit.calls[8].arguments, ["stateNewData", 2, ["foo", "bar"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[9].arguments, ["messageQueued", { tag: "BBB" }, ["foo", "bar"]]);
  t.deepEqual(emit.calls[10].arguments, ["messageMatched", { tag: "AAA" }, ["foo"], false]);
  t.deepEqual(emit.calls[11].arguments, ["stateNewData", 2, ["foo"], { tag: "AAA" }]);
  t.deepEqual(emit.calls[12].arguments, ["messageQueued", { tag: "BBB" }, ["foo"]]);
  t.deepEqual(emit.calls[13].arguments, ["messageMatched", { tag: "BBB" }, ["foo"], false]);
  t.deepEqual(emit.calls[14].arguments, ["stateNewData", 2, ["foo"], { tag: "BBB" }]);
  t.deepEqual(emit.calls[15].arguments, ["messageQueued", { tag: "BBB" }, ["foo"]]);
  t.deepEqual(emit.calls[16].arguments, ["messageMatched", { tag: "BBB" }, ["foo"], false]);
  t.deepEqual(emit.calls[17].arguments, ["stateNewData", 2, ["foo"], { tag: "BBB" }]);
  t.deepEqual(emit.calls[18].arguments, ["messageQueued", { tag: "BBB" }, ["foo"]]);
  t.deepEqual(emit.calls[19].arguments, ["unhandledMessage", { tag: "BBB" }, ["foo"]]);
  t.deepEqual(emit.calls[20].arguments, ["unhandledMessage", { tag: "BBB" }, ["foo"]]);
  t.deepEqual(emit.calls[21].arguments, ["unhandledMessage", { tag: "BBB" }, ["foo"]]);
});
