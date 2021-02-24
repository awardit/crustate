/* @flow */

import ninos from "ninos";
import ava from "ava";
import { EFFECT_ERROR, Storage, updateData } from "../src";
import { args, unhandledEffectError, unhandledMessageError } from "./util";

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
  const model = { id: "test", init, update };

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
    ["messageMatched", msg, []],
  ]);

  s.sendMessage(msg2);

  t.deepEqual(args(recv1), [[msg, ["$"]]]);
  t.deepEqual(args(recv2), []);
  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["$"]],
    ["messageMatched", msg, []],
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
    ["messageMatched", msg, []],
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
    ["messageMatched", msg, []],
  ]);
  t.deepEqual(args(recv1), [[msg, ["$"]]]);
  t.deepEqual(args(recv2), []);

  s.removeEffect(eff2);

  t.deepEqual(args(emit), [
    ["messageQueued", msg, ["$"]],
    ["messageMatched", msg, []],
  ]);
  t.deepEqual(args(recv2), []);
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
    update: t.context.stub(() => updateData(firstData, firstMsg)),
  };

  s.addEffect({ effect: stub1, subscribe: { "initMsg": true } });
  s.addEffect({ effect: stub2, subscribe: { "firstMsg": true } });

  const first = s.createState(firstDef);

  first.sendMessage(initMsg);

  t.deepEqual(args(stub1), []);
  t.deepEqual(args(stub2), [[firstMsg, ["first"]]]);
  // FIXME: This once we swap the stub/spy library
  // $FlowFixMe[prop-missing]
  t.deepEqual(args(firstDef.update), [[firstData, initMsg]]);
  t.is(first.getData(), firstData);
  t.deepEqual(args(emit), [
    ["stateCreated", ["first"], undefined, { name: "firstData" }],
    ["messageQueued", { tag: "initMsg" }, ["first", "$"]],
    ["messageMatched", { tag: "initMsg" }, ["first"]],
    ["stateNewData", { name: "firstData" }, ["first"], { tag: "initMsg" }],
    ["messageQueued", { tag: "firstMsg" }, ["first"]],
    ["messageMatched", { tag: "firstMsg" }, []],
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
    ["messageMatched", { tag: "trigger-effect" }, []],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, []],
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
    ["messageMatched", { tag: "trigger-effect" }, []],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: "My Effect", source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, []],
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

  const p = s.sendMessage({ tag: "trigger-effect", myMessage: true });

  t.deepEqual(s.runningEffects(), [
    { message: { tag: "trigger-effect", myMessage: true }, name: undefined, source: ["$"] },
  ]);
  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect", myMessage: true }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect", myMessage: true }, ["$"]],
    ["messageMatched", { tag: "trigger-effect", myMessage: true }, []],
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(effect), [
    [{ tag: "trigger-effect", myMessage: true }, ["$"]],
  ]);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect", myMessage: true }, ["$"]],
    ["messageMatched", { tag: "trigger-effect", myMessage: true }, []],
    ["messageQueued", { tag: "effect/error", cause: { tag: "trigger-effect", myMessage: true }, error: new Error("My Effect error") }, ["$", "<"]],
    ["unhandledMessage", { tag: "effect/error", cause: { tag: "trigger-effect", myMessage: true }, error: new Error("My Effect error") }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledEffectError({ tag: "effect/error", cause: { tag: "trigger-effect", myMessage: true }, error: new Error("My Effect error") }, ["$", "<"]),
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
    ["messageMatched", { tag: "trigger-effect" }, []],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, []],
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
    ["messageMatched", { tag: "trigger-effect" }, []],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  t.is(await s.wait(), undefined);

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, []],
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
    ["messageMatched", { tag: "trigger-effect" }, []],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  await p;

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, []],
    ["messageQueued", { tag: EFFECT_ERROR, cause: { tag: "trigger-effect" }, error: new Error("My Effect error") }, ["$", "<"]],
    ["unhandledMessage", { tag: EFFECT_ERROR, cause: { tag: "trigger-effect" }, error: new Error("My Effect error") }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledEffectError({ tag: EFFECT_ERROR, cause: { tag: "trigger-effect" }, error: new Error("My Effect error") }, ["$", "<"]),
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
    ["messageMatched", { tag: "trigger-effect" }, []],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["$"], message: { tag: "trigger-effect" } },
  ]);

  t.is(await s.wait(), undefined);

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "trigger-effect" }, ["$"]],
    ["messageMatched", { tag: "trigger-effect" }, []],
    ["messageQueued", { tag: EFFECT_ERROR, cause: { tag: "trigger-effect" }, error: new Error("My Effect error") }, ["$", "<"]],
    ["unhandledMessage", { tag: EFFECT_ERROR, cause: { tag: "trigger-effect" }, error: new Error("My Effect error") }, ["$", "<"]],
  ]);
  t.deepEqual(args(error), [
    unhandledEffectError({ tag: EFFECT_ERROR, cause: { tag: "trigger-effect" }, error: new Error("My Effect error") }, ["$", "<"]),
  ]);
});

test("State async effect", async t => {
  const effect = t.context.stub(async () => ({ tag: "the-reply", data: "foo" }));
  const myEffect = {
    effect,
    subscribe: { "trigger-effect": true },
  };
  const init = t.context.stub(() => updateData({ state: "init" }, { tag: "trigger-effect" }));
  const update = t.context.stub(({ state }, msg) => {
    if (state === "init" && msg.tag === "the-reply") {
      return updateData({ state: msg.data });
    }
  });
  const model = { id: "test", init, update };
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
    ["messageMatched", { tag: "trigger-effect" }, []],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["test"], message: { tag: "trigger-effect" } },
  ]);

  t.is(await state.waitInit(), undefined);

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, { state: "init" }],
    ["messageQueued", { tag: "trigger-effect" }, ["test"]],
    ["messageMatched", { tag: "trigger-effect" }, []],
    ["messageQueued", { tag: "the-reply", data: "foo" }, ["test", "<"]],
    ["messageMatched", { tag: "the-reply", data: "foo" }, ["test"]],
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
  const init = t.context.stub(() => updateData({ state: "init" }, { tag: "trigger-effect" }));
  const update = t.context.stub(({ state }, { tag }) => {
    if (state === "init") {
      if (tag === "the-reply") {
        return updateData({ state: "updating" }, { tag: "second-effect" });
      }
    }
    else if (tag === "finally") {
      return updateData({ state: "done" });
    }
  });
  const model = { id: "test", init, update };
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
    ["messageMatched", { tag: "trigger-effect" }, []],
  ]);
  t.deepEqual(s.runningEffects(), [
    { name: undefined, source: ["test"], message: { tag: "trigger-effect" } },
  ]);

  t.is(await state.waitInit(), undefined);

  t.deepEqual(s.runningEffects(), []);
  t.deepEqual(args(emit), [
    ["stateCreated", ["test"], undefined, { state: "init" }],
    ["messageQueued", { tag: "trigger-effect" }, ["test"]],
    ["messageMatched", { tag: "trigger-effect" }, []],
    ["messageQueued", { tag: "the-reply" }, ["test", "<"]],
    ["messageMatched", { tag: "the-reply" }, ["test"]],
    ["stateNewData", { state: "updating" }, ["test"], { tag: "the-reply" }],
    ["messageQueued", { tag: "second-effect" }, ["test"]],
    ["messageMatched", { tag: "second-effect" }, []],
    ["messageQueued", { tag: "finally" }, ["test", "<"]],
    ["messageMatched", { tag: "finally" }, ["test"]],
    ["stateNewData", { state: "done" }, ["test"], { tag: "finally" }],
  ]);
});
