/* @flow */

import ninos from "ninos";
import ava from "ava";
import { Storage, State, findClosestSupervisor, processInstanceMessages } from "../src/storage";
import { updateData, updateAndSend } from "../src/update";

const test = ninos(ava);
const args = f => f.calls.map(c => c.arguments);

test("Storage can be created without parameters and is empty", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.is(s instanceof Storage, true);
  t.is(s._getStorage(), s);
  t.deepEqual(s.getPath(), []);
  t.deepEqual(s.getSnapshot(), {});
  t.deepEqual(args(emit), []);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, {});
  t.deepEqual(s._effects, []);
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
  t.deepEqual(args(emit), []);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, {});
  t.deepEqual(s._effects, []);
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
  t.deepEqual(args(emit), []);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._effects, []);
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
  t.deepEqual(args(emit), []);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._effects, []);
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
  t.deepEqual(s.getSnapshot(), { test: { id: "test", data: { name: "initData" }, nested: {} } });
  t.is(instance._name, "test");
  t.is(instance.getData(), initData);
  t.is(instance._getStorage(), s);
  t.deepEqual(instance.getPath(), ["test"]);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, initData],
  ]);
  // Looking at internals
  t.deepEqual(s._nested, { test: instance });
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._effects, []);
  t.deepEqual(args(init), [
    [undefined],
  ]);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
});

test("Storage createState throws given the same params", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const initData = { name: "initData" };
  const init = t.context.stub(() => updateData(initData));
  const update = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state = { id: "test", init, update, subscribe };

  s.createState(state);

  t.throws(() => s.createState(state), { instanceOf: Error, message: "Duplicate state 'test'" });

  t.deepEqual(args(init), [[undefined]]);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
  t.deepEqual(args(emit), [["stateCreated", ["test"], undefined, initData]]);
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
  t.deepEqual(args(emit), []);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._effects, []);
  t.deepEqual(args(init), []);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
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
  t.deepEqual(args(emit), []);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._effects, []);
  t.deepEqual(args(init), []);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
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
    t.deepEqual(args(emit), []);
    // Looking at internals
    t.deepEqual(s._nested, {});
    t.deepEqual(s._defs, { test: state });
    t.deepEqual(s._effects, []);
    t.deepEqual(args(init), []);
    t.deepEqual(args(update), []);
    t.deepEqual(args(subscribe), []);
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

  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["$"]],
    ["unhandledMessage", msg, ["$"]],
  ]);
});

test("Sending messages with a name Storage should use the name as source", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const msg = { tag: "testMessage" };

  s.sendMessage(msg, "mysource");

  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["mysource"]],
    ["unhandledMessage", msg, ["mysource"]],
  ]);
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
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, initData],
    ["messageQueued", initMsg, ["test"]],
    ["unhandledMessage", initMsg, ["test"]],
  ]);
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
  t.is(second._name, "second");
  t.deepEqual(second.getPath(), ["first", "second"]);
  t.is(second.getData(), secondData);
  t.is(second._getStorage(), s);
  t.is(first.getState(firstDef), undefined);
  t.is(first.getState(secondDef), second);
  t.is(second.getState(firstDef), undefined);
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["stateCreated", ["first", "second"], undefined, { name: "secondData" }],
  ]);
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
  t.is(second._name, "test");
  t.deepEqual(second.getPath(), ["test", "test"]);
  t.is(second.getData(), initData);
  t.is(second._getStorage(), s);
  t.not(second, first);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, { name: "initData" }],
    ["stateCreated", ["test", "test"], undefined, { name: "initData" }],
  ]);
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

  t.deepEqual(s.getSnapshot(), { test: { id: "test", data: { name: "initData" }, nested: {} } });
  t.deepEqual(args(emit), [["stateCreated", ["test"], undefined, { name: "initData" }]]);
  // Looking at internals
  t.deepEqual(s._nested, { test: inst });
  t.deepEqual(s._defs, { test: state });
  t.is(init.calls.length, 1);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
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
    t.deepEqual(s.getSnapshot(), { test: { id: "test", data: { name: "initData" }, nested: {} } });
    t.is(init.calls.length, 1);
    t.deepEqual(args(update), []);
    t.deepEqual(args(subscribe), []);
    t.deepEqual(args(emit), [["stateCreated", ["test"], undefined, { name: "initData" }]]);
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

  t.deepEqual(args(firstDef.update), []);
  t.is(first.getData(), firstData);
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["messageQueued", { tag: "initMsg" }, ["first", "$"]],
    ["unhandledMessage", { tag: "initMsg" }, ["first", "$"]],
  ]);
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

  t.deepEqual(args(firstDef.update), []);
  t.is(first.getData(), firstData);
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["messageQueued", { tag: "initMsg" }, ["first", "thesource"]],
    ["unhandledMessage", { tag: "initMsg" }, ["first", "thesource"]],
  ]);
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

  t.deepEqual(args(firstDef.update), [[firstData, secondInit]]);
  t.is(first.getData(), firstData);
  t.deepEqual(s.getSnapshot(), {
    first: { id: "first", data: { name: "firstData" }, nested: {
      second: { id: "second", data: { name: "secondData" }, nested: {} },
    } },
  });
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["stateCreated", ["first", "second"], undefined, { name: "secondData" }],
    ["messageQueued", secondInit, ["first", "second"]],
    ["messageMatched", secondInit, ["first"], true],
    ["unhandledMessage", secondInit, ["first", "second"]],
  ]);
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
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, {}],
    ["messageQueued", { tag: "nomatch" }, ["first", "$"]],
    ["unhandledMessage", { tag: "nomatch" }, ["first", "$"]],
  ]);
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

  t.deepEqual(args(firstDef.update), []);
  t.deepEqual(s.getSnapshot(), {
    first: { id: "first", data: { name: "firstData" }, nested: {} },
    second: { id: "second", data: { name: "secondData" }, nested: {} },
  });
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["stateCreated", ["second"], undefined, { name: "secondData" }],
    ["messageQueued", secondInit, ["second"]],
    ["unhandledMessage", secondInit, ["second"]],
  ]);
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

  t.deepEqual(args(firstDef.update), [[firstData, initMsg]]);
  t.is(first.getData(), secondData);
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["messageQueued", initMsg, ["first", "$"]],
    ["messageMatched", initMsg, ["first"], true],
    ["stateNewData", secondData, ["first"], initMsg],
    ["messageQueued", firstMsg, ["first"]],
    ["unhandledMessage", initMsg, ["first", "$"]],
    ["unhandledMessage", firstMsg, ["first"]],
  ]);
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
  const sAB = sA.createState(defB);
  const sAA = sA.createState(defA);
  const sB = s.createState(defB);
  const sBA = sB.createState(defA);
  const sBB = sB.createState(defB);

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

  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "A" }, ["<"]],
    ["unhandledMessage", { tag: "A" }, ["<"]],
    ["messageQueued", { tag: "A" }, ["a", "<"]],
    ["unhandledMessage", { tag: "A" }, ["a", "<"]],
    ["messageQueued", { tag: "B" }, ["a", "b", "<"]],
    ["unhandledMessage", { tag: "B" }, ["a", "b", "<"]],
    ["messageQueued", { tag: "B" }, ["a", "b", "outside"]],
    ["unhandledMessage", { tag: "B" }, ["a", "b", "outside"]],
    ["messageQueued", { tag: "A" }, ["foo", "bar", "<"]],
    ["unhandledMessage", { tag: "A" }, ["foo", "bar", "<"]],
    ["messageQueued", { tag: "A" }, ["foo", "bar", "another"]],
    ["unhandledMessage", { tag: "A" }, ["foo", "bar", "another"]],
  ]);
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

  s.removeState(defA);

  t.deepEqual(args(emit), []);

  s.removeState(defB);

  t.deepEqual(args(emit), []);
  t.is(s.getState(defA), undefined);

  const a = s.createState(defA);

  t.is(a instanceof State, true);
  t.is(s.getState(defA), a);

  s.removeState(defB);

  t.is(s.getState(defA), a);

  s.removeState(defA);

  t.is(s.getState(defA), undefined);
  t.deepEqual(args(emit), [
    ["stateCreated", ["a"], undefined, {}],
    ["stateRemoved", ["a"], {}],
  ]);
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

  t.deepEqual(args(emit), [
    ["stateCreated", ["a"], undefined, {}],
  ]);
  t.is(a.getState(defA), undefined);

  a.removeState(defA);

  t.is(emit.calls.length, 1);

  a.removeState(defB);

  t.is(emit.calls.length, 1);
  t.is(a.getState(defA), undefined);

  const i = a.createState(defA);

  t.is(i instanceof State, true);
  t.is(a.getState(defA), i);

  a.removeState(defB);

  t.is(a.getState(defA), i);

  a.removeState(defA);

  t.is(i.getState(defA), undefined);
  t.deepEqual(args(emit), [
    ["stateCreated", ["a"], undefined, {}],
    ["stateCreated", ["a", "a"], undefined, {}],
    ["stateRemoved", ["a", "a"], {}],
  ]);
  t.deepEqual(args(emitA), []);
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

  t.deepEqual(args(emit), [
    ["stateCreated", ["a"], undefined, false],
    ["messageMatched", { tag: "a", __yes: true }, ["a"], false],
    ["stateNewData", true, ["a"], { tag: "a", __yes: true }],
    ["messageMatched", { tag: "b", __yes: true }, ["a"], false],
    ["stateNewData", true, ["a"], { tag: "b", __yes: true }],
    ["unhandledMessage", { tag: "b", __no: true }, ["a", "test"]],
    ["unhandledMessage", { tag: "a", __no: true }, ["a", "test"]],
  ]);
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

  t.deepEqual(s.getSnapshot(), { foo: { id: "foo", data: 1, nested: {} } });

  t.not(s.getState(d), undefined);
  t.is(s.getState(d), s.getState(d, "foo"));
  t.is(s.getState(d), s.getState(d, "foo"));
  t.is(s.getState(d, "bar"), undefined);
  t.not(s.createState(d, null, "bar"), undefined);

  t.deepEqual(s.getSnapshot(), {
    foo: { id: "foo", data: 1, nested: {} },
    bar: { id: "foo", data: 1, nested: {} },
  });

  // AVA is missing flowtypes, so the truthy check does not eliminate null
  const sFoo: State<any> = (s.getState(d, "foo"): any);
  const sBar: State<any> = (s.getState(d, "bar"): any);

  t.truthy(sFoo);
  t.truthy(sBar);
  t.not(sFoo, sBar);

  t.is(sFoo._name, "foo");
  t.deepEqual(sFoo.getPath(), ["foo"]);
  t.is(sFoo._getStorage(), s);
  t.is(sBar._name, "bar");
  t.deepEqual(sBar.getPath(), ["bar"]);
  t.is(sBar._getStorage(), s);

  s.removeState(d);

  t.deepEqual(s.getSnapshot(), {
    bar: { id: "foo", data: 1, nested: {} },
  });

  t.not(s.createState(d, null, "baz"), undefined);

  t.deepEqual(s.getSnapshot(), {
    bar: { id: "foo", data: 1, nested: {} },
    baz: { id: "foo", data: 1, nested: {} },
  });

  t.is(s.getState(d), undefined);
  t.is(s.getState(d, "foo"), undefined);
  t.not(s.getState(d, "bar"), undefined);
  t.not(s.getState(d, "baz"), undefined);

  s.removeState(d);

  t.deepEqual(s.getSnapshot(), {
    bar: { id: "foo", data: 1, nested: {} },
    baz: { id: "foo", data: 1, nested: {} },
  });

  s.removeState(d, "bar");

  t.deepEqual(s.getSnapshot(), {
    baz: { id: "foo", data: 1, nested: {} },
  });

  t.not(s.createState(d), undefined);

  t.deepEqual(s.getSnapshot(), {
    foo: { id: "foo", data: 1, nested: {} },
    baz: { id: "foo", data: 1, nested: {} },
  });

  s.removeState(d, "foo");

  t.deepEqual(s.getSnapshot(), {
    baz: { id: "foo", data: 1, nested: {} },
  });

  t.deepEqual(args(emit), [
    ["stateCreated", ["foo"], undefined, 1],
    ["stateCreated", ["bar"], null, 1],
    ["stateRemoved", ["foo"], 1],
    ["stateCreated", ["baz"], null, 1],
    ["stateRemoved", ["bar"], 1],
    ["stateCreated", ["foo"], undefined, 1],
    ["stateRemoved", ["foo"], 1],
  ]);
  t.is(init.calls.length, 4);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
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

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, nested: {
    foo: { id: "foo", data: 1, nested: {} },
  } } });

  t.not(nested.getState(d), undefined);
  t.not(nested.getState(d), s.getState(d));
  t.is(nested.getState(d), nested.getState(d, "foo"));
  t.is(nested.getState(d), nested.getState(d, "foo"));
  t.is(nested.getState(d, "bar"), undefined);
  t.not(nested.createState(d, null, "bar"), undefined);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, nested: {
    foo: { id: "foo", data: 1, nested: {} },
    bar: { id: "foo", data: 1, nested: {} },
  } } });

  // AVA is missing flowtypes, so the truthy check does not eliminate null
  const sFoo: State<any> = (nested.getState(d, "foo"): any);
  const sBar: State<any> = (nested.getState(d, "bar"): any);

  t.truthy(sFoo);
  t.truthy(sBar);
  t.not(sFoo, sBar);

  t.is(sFoo._name, "foo");
  t.deepEqual(sFoo.getPath(), ["bar", "foo"]);
  t.is(sFoo._getStorage(), s);
  t.is(sBar._name, "bar");
  t.deepEqual(sBar.getPath(), ["bar", "bar"]);
  t.is(sBar._getStorage(), s);

  nested.removeState(d);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, nested: {
    bar: { id: "foo", data: 1, nested: {} },
  } } });

  t.not(nested.createState(d, null, "baz"), undefined);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, nested: {
    bar: { id: "foo", data: 1, nested: {} },
    baz: { id: "foo", data: 1, nested: {} },
  } } });

  t.is(nested.getState(d), undefined);
  t.is(nested.getState(d, "foo"), undefined);
  t.not(nested.getState(d, "bar"), undefined);
  t.not(nested.getState(d, "baz"), undefined);

  nested.removeState(d);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, nested: {
    bar: { id: "foo", data: 1, nested: {} },
    baz: { id: "foo", data: 1, nested: {} },
  } } });

  nested.removeState(d, "bar");

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, nested: {
    baz: { id: "foo", data: 1, nested: {} },
  } } });

  t.not(nested.createState(d), undefined);

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, nested: {
    foo: { id: "foo", data: 1, nested: {} },
    baz: { id: "foo", data: 1, nested: {} },
  } } });

  nested.removeState(d, "foo");

  t.deepEqual(s.getSnapshot(), { bar: { id: "foo", data: 1, nested: {
    baz: { id: "foo", data: 1, nested: {} },
  } } });

  t.deepEqual(args(emit), [
    ["stateCreated", ["bar"], undefined, 1],
    ["stateCreated", ["bar", "foo"], undefined, 1],
    ["stateCreated", ["bar", "bar"], null, 1],
    ["stateRemoved", ["bar", "foo"], 1],
    ["stateCreated", ["bar", "baz"], null, 1],
    ["stateRemoved", ["bar", "bar"], 1],
    ["stateCreated", ["bar", "foo"], undefined, 1],
    ["stateRemoved", ["bar", "foo"], 1],
  ]);
  t.is(init.calls.length, 5);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
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

  t.deepEqual(args(emit), [
    ["stateCreated", ["bar"], undefined, 1],
    ["stateCreated", ["bar", "foo"], undefined, 1],
    ["stateCreated", ["bar", "bar"], null, 1],
    ["messageQueued", { tag: "AAA", testing: "foo" }, ["bar", "foo", "$"]],
    ["unhandledMessage", { tag: "AAA", testing: "foo" }, ["bar", "foo", "$"]],
    ["messageQueued", { tag: "AAA", testing: "bar" }, ["bar", "bar", "$"]],
    ["unhandledMessage", { tag: "AAA", testing: "bar" }, ["bar", "bar", "$"]],
  ]);
  t.is(init.calls.length, 3);
  t.deepEqual(args(update), []);
  t.is(subscribe.calls.length, 4);
});
