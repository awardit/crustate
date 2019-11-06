/* @flow */

import ninos from "ninos";
import ava from "ava";
import { Storage } from "../src/storage";
import { updateData, updateAndSend } from "../src/update";
import { EFFECT_ERROR } from "../src/effect";
import { args, unhandledMessageError } from "./util";

const test = ninos(ava).serial;

test("Awaiting empty storage does nothing", async t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.deepEqual(s.runningEffects(), []);

  await s.wait();

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), []);
});

test("Awaiting empty state does nothing", async t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const init = t.context.stub(() => updateData("test"));
  const update = t.context.stub();
  const subscribe = t.context.stub();
  const model = { id: "test", init, update, subscribe };

  const state = s.createState(model);

  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, "test"],
  ]);
  t.deepEqual(s.runningEffects(), []);
  t.is(state.getData(), "test");

  t.is(await state.waitInit(), undefined);

  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, "test"],
  ]);
  t.deepEqual(s.runningEffects(), []);
  t.is(state.getData(), "test");
});

test("Sending messages on a Storage should send them to matching effects", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const msg = { tag: "testMessage" };
  const msg2 = { tag: "uncaught" };

  s.addEffect({ effect: recv1, subscribe: { "testMessage": true } });
  s.addEffect({ effect: recv2, subscribe: { "fooMessage": true } });

  s.sendMessage(msg);

  t.deepEqual(args(recv1), [[msg, ["$"]]]);
  t.deepEqual(args(recv2), []);
  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["$"]],
    ["messageMatched", msg, [], false],
  ]);

  s.sendMessage(msg2);

  t.deepEqual(args(recv1), [[msg, ["$"]]]);
  t.deepEqual(args(recv2), []);
  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["$"]],
    ["messageMatched", msg, [], false],
    ["messageQueued", msg2, ["$"]],
    ["unhandledMessage", msg2, ["$"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError(msg2, ["$"]),
  ]);
});

test("Sending messages with a name on a Storage should propagate the name", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const recv1 = t.context.stub();
  const msg = { tag: "testMessage" };

  s.addEffect({ effect: recv1, subscribe: { testMessage: true } });

  s.sendMessage(msg, "themessage");

  t.deepEqual(args(recv1), [[msg, ["themessage"]]]);
  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["themessage"]],
    ["messageMatched", msg, [], false],
  ]);
});

test("Removing a subscriber should not fire when a matching message is sent", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const recv1 = t.context.stub();
  const recv2 = t.context.stub();
  const msg = { tag: "testMessage" };

  const eff1 = { effect: recv1, subscribe: { testMessage: true } };
  const eff2 = { effect: recv2, subscribe: { testMessage: true } };

  s.addEffect(eff1);
  s.addEffect(eff2);
  s.removeEffect(eff2);

  s.sendMessage(msg);

  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["$"]],
    ["messageMatched", msg, [], false],
  ]);
  t.deepEqual(args(recv1), [[msg, ["$"]]]);
  t.deepEqual(args(recv2), []);

  s.removeEffect(eff2);

  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["$"]],
    ["messageMatched", msg, [], false],
  ]);
  t.deepEqual(args(recv2), []);
});

test("Sending messages on a Storage should also trigger unhandledMessage if no active effects are present", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
  const recv = t.context.stub();
  const msg = { tag: "testMessage" };

  s.addEffect({ effect: recv, subscribe: { "testMessage": { passive: true } } });

  s.sendMessage(msg);

  t.deepEqual(args(recv), [[msg, ["$"]]]);
  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["$"]],
    ["messageMatched", msg, [], true],
    ["unhandledMessage", msg, ["$"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError(msg, ["$"]),
  ]);
});

test("Active effects prevent parents and unhandledMessage from receiving", t => {
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

  s.addEffect({ effect: stub1, subscribe: { "initMsg": true } });
  s.addEffect({ effect: stub2, subscribe: { "firstMsg": true } });

  const first = s.createState(firstDef);

  first.sendMessage(initMsg);

  t.deepEqual(args(stub1), []);
  t.deepEqual(args(stub2), [[firstMsg, ["first"]]]);
  t.deepEqual(args(firstDef.update), [[firstData, initMsg]]);
  t.is(first.getData(), firstData);
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["messageQueued", { tag: "initMsg" }, ["first", "$"]],
    ["messageMatched", { tag: "initMsg" }, ["first"], false],
    ["stateNewData", { name: "firstData" }, ["first"], { tag: "initMsg" }],
    ["messageQueued", { tag: "firstMsg" }, ["first"]],
    ["messageMatched", { tag: "firstMsg" }, [], false],
  ]);
});

test("Passive effects always receive messages from children", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
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

  s.addEffect({ effect: stub1, subscribe: { "initMsg": { passive: true } } });
  s.addEffect({ effect: stub2, subscribe: { "firstMsg": { passive: true } } });

  const first = s.createState(firstDef);

  first.sendMessage(initMsg);

  t.deepEqual(args(stub1), [[initMsg, ["first", "$"]]]);
  t.deepEqual(args(stub2), [[firstMsg, ["first"]]]);
  t.deepEqual(args(firstDef.update), [[firstData, initMsg]]);
  t.is(first.getData(), firstData);

  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["messageQueued", { tag: "initMsg" }, ["first", "$"]],
    ["messageMatched", { tag: "initMsg" }, ["first"], false],
    ["stateNewData", { name: "firstData" }, ["first"], { tag: "initMsg" }],
    ["messageQueued", { tag: "firstMsg" }, ["first"]],
    ["messageMatched", { tag: "initMsg" }, [], true],
    ["messageMatched", { tag: "firstMsg" }, [], true],
    ["unhandledMessage", { tag: "firstMsg" }, ["first"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "firstMsg" }, ["first"]),
  ]);
});

test("Immediate reply from effect", async t => {
  const effect = t.context.stub(() => ({ tag: "the-reply", data: "foo" }));
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.addEffect(myEffect);

  const p = s.sendMessage({ tag: "trigger-effect" });

  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: "the-reply", data: "foo" }, ["$", "<"]],
    ["unhandledMessage", { tag: "the-reply", data: "foo" }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "the-reply", data: "foo" }, ["$", "<"]),
  ]);
});

test("Immediate reply from effect with name", async t => {
  const effect = t.context.stub(() => ({ tag: "the-reply", data: "foo" }));
  const myEffect = {
    effect,
    name: "My Effect",
    subscribe: { "trigger-effect": true },
  };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.addEffect(myEffect);

  const p = s.sendMessage({ tag: "trigger-effect" });

  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: "My Effect", source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: "the-reply", data: "foo" }, ["$", "My Effect"]],
    ["unhandledMessage", { tag: "the-reply", data: "foo" }, ["$", "My Effect"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "the-reply", data: "foo" }, ["$", "My Effect"]),
  ]);
});

test("Immediate throw in effect", async t => {
  const effect = t.context.stub(() => {
    throw new Error("My Effect error");
  });
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.addEffect(myEffect);

  const p = s.sendMessage({ tag: "trigger-effect" });

  t.deepEqual(s.runningEffects(), [
    { message: { tag: "trigger-effect" }, name: undefined, source: ["$"] },
  ]);
  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: "effect/error", error: new Error("My Effect error") }, ["$", "<"]],
    ["unhandledMessage", { tag: "effect/error", error: new Error("My Effect error") }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "effect/error", error: new Error("My Effect error") }, ["$", "<"]),
  ]);
});

test("Async reply from effect", async t => {
  const effect = t.context.stub(async () => ({ tag: "the-reply", data: "foo" }));
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.addEffect(myEffect);

  const p = s.sendMessage({ tag: "trigger-effect" });

  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: "the-reply", data: "foo" }, ["$", "<"]],
    ["unhandledMessage", { tag: "the-reply", data: "foo" }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "the-reply", data: "foo" }, ["$", "<"]),
  ]);
});

test("Storage.wait on async reply from effect", async t => {
  const effect = t.context.stub(async () => ({ tag: "the-reply", data: "foo" }));
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.addEffect(myEffect);

  s.sendMessage({ tag: "trigger-effect" });

  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  t.is(await s.wait(), undefined);

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: "the-reply", data: "foo" }, ["$", "<"]],
    ["unhandledMessage", { tag: "the-reply", data: "foo" }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "the-reply", data: "foo" }, ["$", "<"]),
  ]);
});

test("Async throw in effect", async t => {
  const effect = t.context.stub(async () => {
    throw new Error("My Effect error");
  });
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.addEffect(myEffect);

  const p = s.sendMessage({ tag: "trigger-effect" });

  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: EFFECT_ERROR, error: new Error("My Effect error") }, ["$", "<"]],
    ["unhandledMessage", { tag: EFFECT_ERROR, error: new Error("My Effect error") }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: EFFECT_ERROR, error: new Error("My Effect error") }, ["$", "<"]),
  ]);
});

test("Storage.wait on async throw in effect", async t => {
  const effect = t.context.stub(async () => {
    throw new Error("My Effect error");
  });
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.addEffect(myEffect);

  s.sendMessage({ tag: "trigger-effect" });

  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  t.is(await s.wait(), undefined);

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: EFFECT_ERROR, error: new Error("My Effect error") }, ["$", "<"]],
    ["unhandledMessage", { tag: EFFECT_ERROR, error: new Error("My Effect error") }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: EFFECT_ERROR, error: new Error("My Effect error") }, ["$", "<"]),
  ]);
});

test("State async effect", async t => {
  const effect = t.context.stub(async () => ({ tag: "the-reply", data: "foo" }));
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const init = t.context.stub(() => updateAndSend({ state: "init" }, { tag: "trigger-effect" }));
  const update = t.context.stub((s, { data }) => updateData({ state: data }));
  const subscribe = t.context.stub(({ state }) => state === "init" ? { "the-reply": true } : {});
  const model = { id: "test", init, update, subscribe };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  s.addEffect(myEffect);

  const state = s.createState(model);

  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["test"]],
  ]);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, { state: "init" }],
    ["messageQueued", { tag: "trigger-effect" }, ["test"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["test"], message: { tag: "trigger-effect" } },
  ]);

  t.is(await state.waitInit(), undefined);

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, { state: "init" }],
    ["messageQueued", { tag: "trigger-effect" }, ["test"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: "the-reply", data: "foo" }, ["test", "<"]],
    ["messageMatched", { tag: "the-reply", data: "foo" }, ["test"], false],
    ["stateNewData", { state: "foo" }, ["test"], { tag: "the-reply", data: "foo" }],
  ]);
});

test("State async effect chain", async t => {
  const effect = t.context.stub(async () => ({ tag: "the-reply" }));
  const eff2 = t.context.stub(async () => ({ tag: "finally" }));
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const mySecondEffect = {
    effect: eff2,
    subscribe: { "second-effect": true },
  };
  const init = t.context.stub(() => updateAndSend({ state: "init" }, { tag: "trigger-effect" }));
  const update = t.context.stub((_, { tag }) => {
    switch (tag) {
      case "the-reply":
        return updateAndSend({ state: "updating" }, { tag: "second-effect" });
      case "finally":
        return updateData({ state: "done" });
      default:
        throw new Error(`Unexpected tag ${tag}`);
    }
  });
  const subscribe = t.context.stub(({ state }) => state === "init" ? { "the-reply": true } : { "finally": true });
  const model = { id: "test", init, update, subscribe };
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  s.addEffect(myEffect);
  s.addEffect(mySecondEffect);

  const state = s.createState(model);

  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect" }, ["test"]],
  ]);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, { state: "init" }],
    ["messageQueued", { tag: "trigger-effect" }, ["test"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["test"], message: { tag: "trigger-effect" } },
  ]);

  t.is(await state.waitInit(), undefined);

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, { state: "init" }],
    ["messageQueued", { tag: "trigger-effect" }, ["test"]],
    ["messageMatched", { tag: "trigger-effect" }, [], false],
    ["messageQueued", { tag: "the-reply" }, ["test", "<"]],
    ["messageMatched", { tag: "the-reply" }, ["test"], false],
    ["stateNewData", { state: "updating" }, ["test"], { tag: "the-reply" }],
    ["messageQueued", { tag: "second-effect" }, ["test"]],
    ["messageMatched", { tag: "second-effect" }, [], false],
    ["messageQueued", { tag: "finally" }, ["test", "<"]],
    ["messageMatched", { tag: "finally" }, ["test"], false],
    ["stateNewData", { state: "done" }, ["test"], { tag: "finally" }],
  ]);
});
