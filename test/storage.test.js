/* @flow */

import ninos            from "ninos";
import ava              from "ava";
import { Storage
       , StateInstance
       , findSupervisor
       , processInstanceMessages } from "../src/storage";
import { NONE
       , updateData
       , updateAndSend } from "../src/update";

// We redefine this here so we can test it
const MESSAGE_NEW_PARAMS = "crustate/stateNewParams";

const test = ninos(ava);

test("Storage can be created without parameters and is empty", t => {
  const s    = new Storage();
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
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");

  t.is(s.stateDefinition("foo"), undefined);
  // $ExpectError minimal State instance for this
  t.is(s.getNested({ name: "foo" }), undefined);
  t.deepEqual(s.getSnapshot(), {});
  t.is(emit.calls.length, 0);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, {});
  t.deepEqual(s._subscribers, []);
});

test("Storage can register state definitons", t => {
  const s     = new Storage();
  const emit  = t.context.spy(s, "emit");
  const stub1 = t.context.stub();
  const stub2 = t.context.stub();
  const stub3 = t.context.stub();
  const state = { name: "test", init: stub1, update: stub2, subscribe: stub3 };

  t.is(s.registerState(state), undefined);
  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), undefined);
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
  const s     = new Storage();
  const emit  = t.context.spy(s, "emit");
  const stub1 = t.context.stub();
  const stub2 = t.context.stub();
  const stub3 = t.context.stub();
  const state = { name: "test", init: stub1, update: stub2, subscribe: stub3 };

  t.is(s.registerState(state), undefined);
  t.throws(() => s.registerState(state), { instanceOf: Error, message: "Duplicate state name test"});

  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), undefined);
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

test("Storage getNestedOrCreate creates a new state instance", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const initData  = { name: "initData" };
  const init      = t.context.stub(() => updateData(initData));
  const update    = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state     = { name: "test", init, update, subscribe };
  const instance  = s.getNestedOrCreate(state);

  t.is(instance instanceof StateInstance, true);
  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), instance);
  t.deepEqual(s.getSnapshot(), { test: { defName: "test", data: { name: "initData" }, params: undefined, nested: {} } });
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
  t.is(init.calls.length, 1)
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("Storage getNestedOrCreate returns the same instance given the same params", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const initData  = { name: "initData" };
  const init      = t.context.stub(() => updateData(initData));
  const update    = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state     = { name: "test", init, update, subscribe };
  const instance  = s.getNestedOrCreate(state);
  const instance2 = s.getNestedOrCreate(state);

  t.is(instance, instance2);
  t.is(init.calls.length, 1)
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
  t.deepEqual(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, initData]);
});

test.failing("Storage getNestedOrCreate sends an update message and returns the same instance when new params are supplied", t => {
  const s            = new Storage();
  const emit         = t.context.spy(s, "emit");
  const initData     = { name: "initData" };
  const init         = t.context.stub(() => updateData(initData));
  const update       = t.context.stub((state, msg) => updateData(msg.params));
  const subscribe    = t.context.stub(() => ({ [MESSAGE_NEW_PARAMS]: true }));
  const state        = { name: "test", init, update, subscribe };
  const instance     = s.getNestedOrCreate(state, 1);
  const instanceEmit = t.context.spy(instance, "emit");
  const instance2    = s.getNestedOrCreate(state, 2);

  t.is(instance, instance2);
  t.is(init.calls.length, 1)
  t.deepEqual(init.calls[0].arguments, [undefined]);
  t.is(update.calls.length, 1);
  t.deepEqual(init.calls[0].arguments, [initData, { tag: MESSAGE_NEW_PARAMS, params: 2 }]);
  t.is(subscribe.calls.length, 1);
  t.deepEqual(subscribe.calls[0].arguments, initData);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, initData]);
  t.deepEqual(emit.calls[1].arguments, ["stateNewData", 2, ["test"], { tag: MESSAGE_NEW_PARAMS, params: 2 }]);
  // TODO: How to ensure call order? instance should fire before storage
  t.deepEqual(instanceEmit.calls.length, 1);
  t.deepEqual(instanceEmit.calls[1].arguments, ["stateNewData", 2, ["test"], { tag: MESSAGE_NEW_PARAMS, params: 2 }]);
});

test("Storage getNestedOrCreate throws when trying to use a new state definition with the same identifier", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const initData  = { name: "initData" };
  const init      = t.context.stub(() => updateData(initData));
  const update    = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state     = { name: "test", init, update, subscribe };
  const state2    = { name: "test", init, update, subscribe };
  s.registerState(state);
  t.throws(() => s.getNestedOrCreate(state2), { instanceOf: Error, message: "State object mismatch for state test" });

  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  t.deepEqual(emit.calls.length, 0);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.is(init.calls.length, 0)
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("Storage getNested on non-existing state instance should throw when using a mismatched state-definition of same name in dev-mode", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const initData  = { name: "initData" };
  const init      = t.context.stub(() => updateData(initData));
  const update    = t.context.stub();
  const subscribe = t.context.stub(() => []);
  const state     = { name: "test", init, update, subscribe };
  const state2    = { name: "test", init, update, subscribe };
  s.registerState(state);
  t.throws(() => s.getNested(state2), { instanceOf: Error, message: "State object mismatch for state test" });

  t.is(s.stateDefinition("test"), state);
  t.is(s.getNested(state), undefined);
  t.deepEqual(s.getSnapshot(), {});
  t.deepEqual(emit.calls.length, 0);
  // Looking at internals
  t.deepEqual(s._nested, {});
  t.deepEqual(s._defs, { test: state });
  t.deepEqual(s._subscribers, []);
  t.is(init.calls.length, 0)
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("Storage getNested on non-existing state instance should return undefined when using a mismatched state-definition of same name in dev-mode", t => {
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const s         = new Storage();
    const emit      = t.context.spy(s, "emit");
    const initData  = { name: "initData" };
    const init      = t.context.stub(() => updateData(initData));
    const update    = t.context.stub();
    const subscribe = t.context.stub(() => []);
    const state     = { name: "test", init, update, subscribe };
    const state2    = { name: "test", init, update, subscribe };

    s.registerState(state);
    t.is(s.getNested(state2), undefined);

    t.is(s.stateDefinition("test"), state);
    t.is(s.getNested(state), undefined);
    t.deepEqual(s.getSnapshot(), {});
    t.deepEqual(emit.calls.length, 0);
    // Looking at internals
    t.deepEqual(s._nested, {});
    t.deepEqual(s._defs, { test: state });
    t.deepEqual(s._subscribers, []);
    t.is(init.calls.length, 0)
    t.is(update.calls.length, 0);
    t.is(subscribe.calls.length, 0);
  }
  finally {
    process.env.NODE_ENV = nodeEnv;
  }
});

test("Sending messages on an empty storage only results in unhandledMessage events", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");
  const msg  = { tag: "testMessage" };

  s.sendMessage(msg);

  t.deepEqual(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["$"]]);
  t.deepEqual(emit.calls[1].arguments, ["unhandledMessage", msg, ["$"]]);
});

test("Sending messages with a name Storage should use the name as source", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");
  const msg  = { tag: "testMessage" };

  s.sendMessage(msg, "mysource");

  t.deepEqual(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["mysource"]]);
  t.deepEqual(emit.calls[1].arguments, ["unhandledMessage", msg, ["mysource"]]);
});

test("Sending messages on a Storage should send them to matching subscribers", t => {
  const s     = new Storage();
  const emit  = t.context.spy(s, "emit");
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const msg   = { tag: "testMessage" };
  const msg2  = { tag: "uncaught" };

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
  const s     = new Storage();
  const emit  = t.context.spy(s, "emit");
  const recv1 = t.context.stub();
  const msg   = { tag: "testMessage" };
  const msg2  = { tag: "uncaught" };

  s.addSubscriber(recv1, { testMessage: true });

  s.sendMessage(msg, "themessage");

  t.is(recv1.calls.length, 1);
  t.deepEqual(recv1.calls[0].arguments, [msg, ["themessage"]]);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", msg, ["themessage"]]);
  t.deepEqual(emit.calls[1].arguments, ["messageMatched", msg, [], false]);
});

test("Removing a subscriber should not fire when a matching message is sent", t => {
  const s     = new Storage();
  const emit  = t.context.spy(s, "emit");
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const msg   = { tag: "testMessage" };

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
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");
  const recv = t.context.stub();
  const msg  = { tag: "testMessage" };

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
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const initData  = { name: "initData" };
  const initMsg   = { tag: "initMsg" };
  const init      = t.context.stub(() => updateAndSend(initData, initMsg));
  const update    = t.context.stub(() => NONE);
  // Should never receive this since messages are not self-referencing
  const subscribe = t.context.stub(() => ({ "initMsg": true }));
  const state     = { name: "test", init, update, subscribe };

  const instance = s.getNestedOrCreate(state);

  t.is(init.calls.length, 1);
  t.is(subscribe.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, initData]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", initMsg, ["test"]]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", initMsg, ["test"]]);
});

test("States can be nested", t => {
  const s             = new Storage();
  const emit          = t.context.spy(s, "emit");
  const firstData     = { name: "firstData" };
  const firstDef      = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(),
    subscribe: t.context.stub(() => ({})),
  };
  const secondData    = { name: "secondData" };
  const secondDef     = {
    name: "second",
    init: t.context.stub(() => updateData(secondData)),
    update: t.context.stub(),
    subscribe: t.context.stub(() => ({})),
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
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["first", "second"], undefined, { name: "secondData" }]);
});

test("States of the same definition can be nested", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const initData  = { name: "initData" };
  const init      = t.context.stub(() => updateData(initData));
  const update    = t.context.stub(() => NONE);
  const subscribe = t.context.stub(() => ({}));
  const state     = { name: "test", init, update, subscribe };
  const first     = s.getNestedOrCreate(state);

  t.is(first.getNested(state), undefined);

  const second = first.getNestedOrCreate(state);

  t.is(second instanceof StateInstance, true);
  t.is(second.getName(), "test");
  t.deepEqual(second.getPath(), ["test", "test"]);
  t.is(second.getData(), initData);
  t.is(second.getStorage(), s);
  t.not(second, first);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, { name: "initData" }]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["test", "test"], undefined, { name: "initData" }]);
});

test("StateInstance getNested throws when trying to use a new state definition with the same identifier", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const initData  = { name: "initData" };
  const init      = t.context.stub(() => updateData(initData));
  const update    = t.context.stub();
  const subscribe = t.context.stub(() => ({}));
  const state     = { name: "test", init, update, subscribe };
  const state2    = { name: "test", init, update, subscribe };
  s.registerState(state);
  const inst = s.getNestedOrCreate(state);

  t.throws(() => inst.getNested(state2), { instanceOf: Error, message: "State object mismatch for state test" });

  t.deepEqual(s.getSnapshot(), { test: { defName: "test", data: { name: "initData" }, params: undefined, nested: {} } });
  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, { name: "initData" }]);
  // Looking at internals
  t.deepEqual(s._nested, { test: inst });
  t.deepEqual(s._defs, { test: state });
  t.is(init.calls.length, 1)
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("StateInstance getNested on non-existing state instance should return undefined when using a mismatched state-definition of same name in dev-mode", t => {
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const s         = new Storage();
    const emit      = t.context.spy(s, "emit");
    const initData  = { name: "initData" };
    const init      = t.context.stub(() => updateData(initData));
    const update    = t.context.stub();
    const subscribe = t.context.stub(() => ({}));
    const state     = { name: "test", init, update, subscribe };
    const state2    = { name: "test", init, update, subscribe };

    s.registerState(state);

    const inst = s.getNestedOrCreate(state);

    t.is(inst instanceof StateInstance, true);

    t.is(inst.getNested(state2), undefined);

    t.is(s.stateDefinition("test"), state);
    t.is(inst.getNested(state), undefined);
    t.deepEqual(s.getSnapshot(), { test: { defName: "test", data: { name: "initData" }, params: undefined, nested: {} } });
    t.is(init.calls.length, 1)
    t.is(update.calls.length, 0);
    t.is(subscribe.calls.length, 0);
    t.is(emit.calls.length, 1);
    t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["test"], undefined, { name: "initData" }]);
  }
  finally {
    process.env.NODE_ENV = nodeEnv;
  }
});

test("Messages sent on StateInstance should propagate upwards", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const initMsg   = { tag: "initMsg" };
  const firstDef  = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };

  const first = s.getNestedOrCreate(firstDef);

  first.sendMessage(initMsg);

  t.is(firstDef.update.calls.length, 0);
  t.is(first.getData(), firstData);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "initMsg" }, ["first", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", { tag: "initMsg" }, ["first", "$"]]);
});

test("Messages with a sourceName sent on StateInstance should propagate upwards with that name", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const initMsg   = { tag: "initMsg" };
  const firstDef  = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };

  const first = s.getNestedOrCreate(firstDef);

  first.sendMessage(initMsg, "thesource");

  t.is(firstDef.update.calls.length, 0);
  t.is(first.getData(), firstData);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "initMsg" }, ["first", "thesource"]]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", { tag: "initMsg" }, ["first", "thesource"]]);
});

test("StateInstance init is sent to parent instances", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const firstDef  = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => NONE),
    // Passive, so we should get it but also passthrough
    subscribe: t.context.stub(() => ({ "secondInit": { passive: true } })),
  };
  const secondData = { name: "secondData" };
  const secondInit = { tag: "secondInit" };
  const secondDef  = {
    name: "second",
    init: t.context.stub(() => updateAndSend(secondData, secondInit)),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };

  const first  = s.getNestedOrCreate(firstDef);
  const second = first.getNestedOrCreate(secondDef);

  t.is(firstDef.update.calls.length, 1);
  t.deepEqual(firstDef.update.calls[0].arguments, [firstData, secondInit]);
  t.is(first.getData(), firstData);
  t.deepEqual(s.getSnapshot(), {
    first:  { defName: "first",  data: { name: "firstData" },  params: undefined, nested: {
      second: { defName: "second", data: { name: "secondData" }, params: undefined, nested: {} },
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
  const s        = new Storage();
  const emit     = t.context.spy(s, "emit");
  const firstDef = {
    name: "first",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    // Passive, so we should get it but also passthrough
    subscribe: t.context.stub(() => ({ "never": true })),
  };

  const f = s.getNestedOrCreate(firstDef);

  f.sendMessage({ tag: "nomatch" });
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, {}]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "nomatch" }, ["first", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["unhandledMessage", { tag: "nomatch" }, ["first", "$"]]);
});

test("StateInstance init is sent to parent instances, but not siblings", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const firstData = { name: "firstData" };
  const firstDef  = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => NONE),
    // Passive, so we should get it but also passthrough
    subscribe: t.context.stub(() => ({ "secondInit": { passive: true } })),
  };
  const secondData    = { name: "secondData" };
  const secondInit    = { tag: "secondInit" };
  const secondDef     = {
    name: "second",
    init: t.context.stub(() => updateAndSend(secondData, secondInit)),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };

  const first  = s.getNestedOrCreate(firstDef);
  const second = s.getNestedOrCreate(secondDef);

  t.is(firstDef.update.calls.length, 0);
  t.deepEqual(s.getSnapshot(), {
    first:  { defName: "first",  data: { name: "firstData" },  params: undefined, nested: {} },
    second: { defName: "second", data: { name: "secondData" }, params: undefined, nested: {} },
  });
  t.is(emit.calls.length, 4);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["first"], undefined, { name: "firstData" }]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["second"], undefined, { name: "secondData" }]);
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", secondInit, ["second"]]);
  t.deepEqual(emit.calls[3].arguments, ["unhandledMessage", secondInit, ["second"]]);
});

test("Messages generated during processing are handled in order", t => {
  const s          = new Storage();
  const emit       = t.context.spy(s, "emit");
  const firstData  = { name: "firstData" };
  const secondData = { name: "secondData" };
  const initMsg    = { tag: "initMsg" };
  const firstMsg   = { tag: "firstMsg" };
  const firstDef   = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(secondData, firstMsg)),
    subscribe: t.context.stub(() => ({ "initMsg": { passive: true } })),
  };

  const first  = s.getNestedOrCreate(firstDef);

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
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const stub1     = t.context.stub();
  const stub2     = t.context.stub();
  const firstData = { name: "firstData" };
  const initMsg   = { tag: "initMsg" };
  const firstMsg  = { tag: "firstMsg" };
  const firstDef  = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(firstData, firstMsg)),
    subscribe: t.context.stub(() => ({ "initMsg": true })),
  };

  s.addSubscriber(stub1, { "initMsg": true });
  s.addSubscriber(stub2, { "firstMsg": true });

  const first = s.getNestedOrCreate(firstDef);

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
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const stub1     = t.context.stub();
  const stub2     = t.context.stub();
  const firstData = { name: "firstData" };
  const initMsg   = { tag: "initMsg" };
  const firstMsg  = { tag: "firstMsg" };
  const firstDef  = {
    name: "first",
    init: t.context.stub(() => updateData(firstData)),
    update: t.context.stub(() => updateAndSend(firstData, firstMsg)),
    subscribe: t.context.stub(() => ({ "initMsg": true })),
  };

  s.addSubscriber(stub1, { "initMsg": { passive: true } });
  s.addSubscriber(stub2, { "firstMsg": { passive: true } });

  const first = s.getNestedOrCreate(firstDef);

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

test("findSupervisor", t => {
  const defA = {
    name: "a",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };
  const defB = {
    name: "b",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };
  const s = new Storage();

  const sA  = s.getNestedOrCreate(defA);
  const sAB = s.getNestedOrCreate(defA).getNestedOrCreate(defB);
  const sAA = s.getNestedOrCreate(defA).getNestedOrCreate(defA);
  const sB  = s.getNestedOrCreate(defB);
  const sBA = s.getNestedOrCreate(defB).getNestedOrCreate(defA);
  const sBB = s.getNestedOrCreate(defB).getNestedOrCreate(defB);

  t.is(findSupervisor(s, []), s);
  t.is(findSupervisor(s, ["a"]), sA);
  t.is(findSupervisor(s, ["a", "b"]), sAB);
  t.is(findSupervisor(s, ["a", "a"]), sAA);
  t.is(findSupervisor(s, ["b"]), sB);
  t.is(findSupervisor(s, ["b", "a"]), sBA);
  t.is(findSupervisor(s, ["b", "b"]), sBB);
  t.is(findSupervisor(s, ["c"]), null);
  t.is(findSupervisor(s, ["c", "d"]), null);
});

test("Storage.replyMessage", t => {
  const defA = {
    name: "a",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };
  const defB = {
    name: "b",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };
  const s    = new Storage();
  const msgA = { tag: "A" };
  const msgB = { tag: "B" };

  s.getNestedOrCreate(defA).getNestedOrCreate(defB);

  const emit = t.context.spy(s, "emit");

  t.throws(() => s.replyMessage(msgA, ["foo", "bar"]), { instanceOf: Error, message: "Could not find state instance at [foo, bar]."});

  s.replyMessage(msgA, []);
  s.replyMessage(msgA, ["a"]);
  s.replyMessage(msgB, ["a", "b"]);
  s.replyMessage(msgB, ["a", "b"], "outside");

  t.is(emit.calls.length, 8);
  t.deepEqual(emit.calls[0].arguments, ["messageQueued", { tag: "A" }, ["<"]]);
  t.deepEqual(emit.calls[1].arguments, ["unhandledMessage", { tag: "A" }, ["<"]]);
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", { tag: "A" }, ["a", "<"]]);
  t.deepEqual(emit.calls[3].arguments, ["unhandledMessage", { tag: "A" }, ["a", "<"]]);
  t.deepEqual(emit.calls[4].arguments, ["messageQueued", { tag: "B" }, ["a", "b", "<"]]);
  t.deepEqual(emit.calls[5].arguments, ["unhandledMessage", { tag: "B" }, ["a", "b", "<"]]);
  t.deepEqual(emit.calls[6].arguments, ["messageQueued", { tag: "B" }, ["a", "b", "outside"]]);
  t.deepEqual(emit.calls[7].arguments, ["unhandledMessage", { tag: "B" }, ["a", "b", "outside"]]);
});

test("Storage.removeNested", t => {
  const s = new Storage();
  const defA = {
    name: "a",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };
  const defB = {
    name: "b",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };
  const emit = t.context.spy(s, "emit");

  t.is(s.getNested(defA), undefined);
  t.is(s.removeNested(defA), undefined);
  t.is(emit.calls.length, 0);
  t.is(s.removeNested(defB), undefined);
  t.is(emit.calls.length, 0);
  t.is(s.getNested(defA), undefined);

  const a = s.getNestedOrCreate(defA);

  t.is(a instanceof StateInstance, true);
  t.is(s.getNested(defA), a);
  t.is(s.removeNested(defB), undefined);
  t.is(s.getNested(defA), a);
  t.is(s.removeNested(defA), undefined);
  t.is(s.getNested(defA), undefined);
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], undefined, {}]);
  t.deepEqual(emit.calls[1].arguments, ["stateRemoved", ["a"], {}]);
});

test("StateInstance.removeNested", t => {
  const s = new Storage();
  const defA = {
    name: "a",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };
  const defB = {
    name: "b",
    init: t.context.stub(() => updateData({})),
    update: t.context.stub(() => NONE),
    subscribe: t.context.stub(() => ({})),
  };
  const emit  = t.context.spy(s, "emit");
  const a     = s.getNestedOrCreate(defA);
  const emitA = t.context.spy(a, "emit");

  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], undefined, {}]);
  t.is(a.getNested(defA), undefined);
  t.is(a.removeNested(defA), undefined);
  t.is(emit.calls.length, 1);
  t.is(a.removeNested(defB), undefined);
  t.is(emit.calls.length, 1);
  t.is(a.getNested(defA), undefined);

  const i = a.getNestedOrCreate(defA);

  t.is(i instanceof StateInstance, true);
  t.is(a.getNested(defA), i);
  t.is(a.removeNested(defB), undefined);
  t.is(a.getNested(defA), i);
  t.is(a.removeNested(defA), undefined);
  t.is(i.getNested(defA), undefined);
  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], undefined, {}]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["a", "a"], undefined, {}]);
  t.deepEqual(emit.calls[2].arguments, ["stateRemoved", ["a", "a"], {}]);
  t.is(emitA.calls.length, 0);
});

test("Storage updates subscribe during processing when state data is updated", t => {
  const s = new Storage();
  const def = {
    name: "a",
    init: t.context.stub(() => updateData(false)),
    update: t.context.stub(() => updateData(true)),
    subscribe: t.context.stub(s => s ? { b: true } : { a: true }),
  };

  const emit  = t.context.spy(s, "emit");
  const i = s.getNestedOrCreate(def);

  processInstanceMessages(s, i, [
    { tag: "b", __no: true },
    { tag: "a", __yes: true },
    { tag: "b", __yes: true },
    { tag: "a", __no: true }
  ], ["a", "test"])

  t.is(emit.calls.length, 11);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], undefined, false]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "b", __no: true }, ["a", "test"]]);
  t.deepEqual(emit.calls[2].arguments, ["messageQueued", { tag: "a", __yes: true }, ["a", "test"]]);
  t.deepEqual(emit.calls[3].arguments, ["messageQueued", { tag: "b", __yes: true }, ["a", "test"]]);
  t.deepEqual(emit.calls[4].arguments, ["messageQueued", { tag: "a", __no: true }, ["a", "test"]]);
  t.deepEqual(emit.calls[5].arguments, ["messageMatched", { tag: "a", __yes: true }, ["a"], false]);
  t.deepEqual(emit.calls[6].arguments, ["stateNewData", true, ["a"], { tag: "a", __yes: true }]);
  t.deepEqual(emit.calls[7].arguments, ["messageMatched", { tag: "b", __yes: true }, ["a"], false]);
  t.deepEqual(emit.calls[8].arguments, ["stateNewData", true, ["a"], { tag: "b", __yes: true }]);
  t.deepEqual(emit.calls[9].arguments, ["unhandledMessage", { tag: "b", __no: true }, ["a", "test"]]);
  t.deepEqual(emit.calls[10].arguments, ["unhandledMessage", { tag: "a", __no: true }, ["a", "test"]]);
});

test("restoreSnapshot throws if it cannot find a matching state definition", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");

  t.throws(() => s.restoreSnapshot({ foo: { defName: "bar", data: null, params: null, nested: {} } }), { message: "Missing state definition for state with name bar" });

  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", { foo: { defName: "bar", data: null, params: null, nested: {} } }]);
});

test("restoreSnapshot works on empty", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ });

  t.deepEqual(s.getSnapshot(), { });

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", {}]);
  t.deepEqual(emit.calls[1].arguments, ["snapshotRestored"]);
});

test("restoreSnapshot restores a snapshot", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const init      = t.context.stub(() => updateData(1));
  const update    = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    name: "foo",
    init,
    update,
    subscribe,
  };

  s.registerState(d);

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ foo: { defName: "foo", data: 3, params: 23, nested: {} } });

  t.deepEqual(s.getSnapshot(), { foo: { defName: "foo", data: 3, params: 23, nested: {} } });

  t.not(s.getNested(d), undefined);
  t.deepEqual((s.getNested(d): any).getData(), 3);

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", { foo: { defName: "foo", data: 3, params: 23, nested: {} } }]);
  t.deepEqual(emit.calls[1].arguments, ["snapshotRestored"]);
  t.is(init.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("restoreSnapshot restores a snapshot with a differing name", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const init      = t.context.stub(() => updateData(1));
  const update    = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    name: "bar",
    init,
    update,
    subscribe,
  };

  s.registerState(d);

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ foo: { defName: "bar", data: 3, params: 23, nested: {} } });

  t.deepEqual(s.getSnapshot(), { foo: { defName: "bar", data: 3, params: 23, nested: {} } });

  // Test with getNested when we have a working named getNested

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", { foo: { defName: "bar", data: 3, params: 23, nested: {} } }]);
  t.deepEqual(emit.calls[1].arguments, ["snapshotRestored"]);
  t.is(init.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});

test("restoreSnapshot restores nested snapshots", t => {
  const s         = new Storage();
  const emit      = t.context.spy(s, "emit");
  const init      = t.context.stub(() => updateData(1));
  const update    = t.context.stub(() => updateData(2));
  const subscribe = t.context.stub(() => ({}));
  const d = {
    name: "foo",
    init,
    update,
    subscribe,
  };

  s.registerState(d);

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ foo: { defName: "foo", data: 3, params: 23, nested: { foo: { defName: "foo", data: 5, params: 2, nested: {} } } } });

  t.deepEqual(s.getSnapshot(), { foo: { defName: "foo", data: 3, params: 23, nested: { foo: { defName: "foo", data: 5, params: 2, nested: {} } } } });

  t.not(s.getNested(d), undefined);
  t.deepEqual((s.getNested(d): any).getData(), 3);
  t.not((s.getNested(d): any).getNested(d), undefined);
  t.deepEqual(((s.getNested(d): any).getNested(d): any).getData(), 5);

  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["snapshotRestore", { foo: { defName: "foo", data: 3, params: 23, nested: { foo: { defName: "foo", data: 5, params: 2, nested: {} } } } }]);
  t.deepEqual(emit.calls[1].arguments, ["snapshotRestored"]);
  t.is(init.calls.length, 0);
  t.is(update.calls.length, 0);
  t.is(subscribe.calls.length, 0);
});
