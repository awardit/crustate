/* @flow */

import ninos from "ninos";
import ava from "ava";
import { Storage } from "../src/storage";
import { updateData, updateAndSend } from "../src/update";
import { args, unhandledMessageError } from "./util";

const test = ninos(ava).serial;

test("broadcastMessage triggers unhandledMessage on empty", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.broadcastMessage({ tag: "AAA" });

  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "AAA" }, ["@"]],
    ["unhandledMessage", { tag: "AAA" }, ["@"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "AAA" }, ["@"]),
  ]);
});

test("broadcastMessage with name uses that name as source", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  s.broadcastMessage({ tag: "AAA" }, "the broadcast");

  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "AAA" }, ["the broadcast"]],
    ["unhandledMessage", { tag: "AAA" }, ["the broadcast"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "AAA" }, ["the broadcast"]),
  ]);
});

test("broadcastMessage triggers attempts to send messages to all states", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
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

  s.broadcastMessage({ tag: "AAA" });

  t.deepEqual(args(emit), [
    ["stateCreated", ["foo"], undefined, 1],
    ["stateCreated", ["foo", "bar"], undefined, 1],
    ["messageQueued", { tag: "AAA" }, ["@"]],
    ["unhandledMessage", { tag: "AAA" }, ["@"]],
  ]);
  t.deepEqual(args(subscribe), [
    [1],
    [1],
  ]);
  t.deepEqual(args(update), []);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "AAA" }, ["@"]),
  ]);
});

test("broadcastMessage sends a message to all states with deepest first", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
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

  s.broadcastMessage({ tag: "AAA" });

  t.deepEqual(args(emit), [
    ["stateCreated", ["foo"], undefined, 1],
    ["stateCreated", ["foo", "foo"], undefined, 1],
    ["stateCreated", ["foo", "bar"], undefined, 1],
    ["messageQueued", { tag: "AAA" }, ["@"]],
    ["messageMatched", { tag: "AAA" }, ["foo", "foo"], false],
    ["stateNewData", 2, ["foo", "foo"], { tag: "AAA" }],
    ["messageMatched", { tag: "AAA" }, ["foo", "bar"], false],
    ["stateNewData", 2, ["foo", "bar"], { tag: "AAA" }],
    ["messageMatched", { tag: "AAA" }, ["foo"], false],
    ["stateNewData", 2, ["foo"], { tag: "AAA" }],
  ]);
  t.deepEqual(args(subscribe), [
    [1],
    [2],
    [1],
    [2],
    [1],
    [2],
  ]);
  t.is(update.calls.length, 3);
  t.deepEqual(args(error), []);
});

test("broadcastMessage will still trigger unhandledMessage if only passive effects are used", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
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

  s.broadcastMessage({ tag: "AAA" });

  t.deepEqual(args(emit), [
    ["stateCreated", ["foo"], undefined, 1],
    ["stateCreated", ["foo", "foo"], undefined, 1],
    ["stateCreated", ["foo", "bar"], undefined, 1],
    ["messageQueued", { tag: "AAA" }, ["@"]],
    ["messageMatched", { tag: "AAA" }, ["foo", "foo"], true],
    ["stateNewData", 2, ["foo", "foo"], { tag: "AAA" }],
    ["messageMatched", { tag: "AAA" }, ["foo", "bar"], true],
    ["stateNewData", 2, ["foo", "bar"], { tag: "AAA" }],
    ["messageMatched", { tag: "AAA" }, ["foo"], true],
    ["stateNewData", 2, ["foo"], { tag: "AAA" }],
    ["unhandledMessage", { tag: "AAA" }, ["@"]],
  ]);
  t.deepEqual(args(subscribe), [
    [1],
    [2],
    [1],
    [2],
    [1],
    [2],
  ]);
  t.is(update.calls.length, 3);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "AAA" }, ["@"]),
  ]);
});

test("broadcastMessage will not trigger unhandledMessage if at least one is a non-passive subscriber", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
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

  s.broadcastMessage({ tag: "AAA" });

  t.deepEqual(args(emit), [
    ["stateCreated", ["foo"], undefined, 1],
    ["stateCreated", ["bar"], undefined, 1],
    ["messageQueued", { tag: "AAA" }, ["@"]],
    ["messageMatched", { tag: "AAA" }, ["foo"], true],
    ["stateNewData", 2, ["foo"], { tag: "AAA" }],
    ["messageMatched", { tag: "AAA" }, ["bar"], false],
    ["stateNewData", 2, ["bar"], { tag: "AAA" }],
  ]);
  t.deepEqual(args(subscribe), [
    [1],
    [2],
  ]);
  t.deepEqual(args(subscribe2), [
    [1],
    [2],
  ]);
  t.is(update.calls.length, 2);
  t.deepEqual(args(error), []);
});

test("broadcastMessage will not trigger unhandledMessage if at least one is a non-passive subscriber, nested variant", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
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

  s.broadcastMessage({ tag: "AAA" });

  t.deepEqual(args(emit), [
    ["stateCreated", ["foo"], undefined, 1],
    ["stateCreated", ["foo", "bar"], undefined, 1],
    ["messageQueued", { tag: "AAA" }, ["@"]],
    ["messageMatched", { tag: "AAA" }, ["foo", "bar"], false],
    ["stateNewData", 2, ["foo", "bar"], { tag: "AAA" }],
    ["messageMatched", { tag: "AAA" }, ["foo"], true],
    ["stateNewData", 2, ["foo"], { tag: "AAA" }],
  ]);
  t.deepEqual(args(subscribe), [
    [1],
    [2],
  ]);
  t.deepEqual(args(subscribe2), [
    [1],
    [2],
  ]);
  t.is(update.calls.length, 2);
  t.deepEqual(args(error), []);
});

test("broadcastMessage propagates messages in order", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});
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

  s.broadcastMessage({ tag: "AAA" });

  t.deepEqual(args(emit), [
    ["stateCreated", ["foo"], undefined, 1],
    ["stateCreated", ["foo", "foo"], undefined, 1],
    ["stateCreated", ["foo", "bar"], undefined, 1],
    ["messageQueued", { tag: "AAA" }, ["@"]],
    ["messageMatched", { tag: "AAA" }, ["foo", "foo"], false],
    ["stateNewData", 2, ["foo", "foo"], { tag: "AAA" }],
    ["messageQueued", { tag: "BBB" }, ["foo", "foo"]],
    ["messageMatched", { tag: "AAA" }, ["foo", "bar"], false],
    ["stateNewData", 2, ["foo", "bar"], { tag: "AAA" }],
    ["messageQueued", { tag: "BBB" }, ["foo", "bar"]],
    ["messageMatched", { tag: "AAA" }, ["foo"], false],
    ["stateNewData", 2, ["foo"], { tag: "AAA" }],
    ["messageQueued", { tag: "BBB" }, ["foo"]],
    ["messageMatched", { tag: "BBB" }, ["foo"], false],
    ["stateNewData", 2, ["foo"], { tag: "BBB" }],
    ["messageQueued", { tag: "BBB" }, ["foo"]],
    ["messageMatched", { tag: "BBB" }, ["foo"], false],
    ["stateNewData", 2, ["foo"], { tag: "BBB" }],
    ["messageQueued", { tag: "BBB" }, ["foo"]],
    ["unhandledMessage", { tag: "BBB" }, ["foo"]],
    ["unhandledMessage", { tag: "BBB" }, ["foo"]],
    ["unhandledMessage", { tag: "BBB" }, ["foo"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "BBB" }, ["foo"]),
    unhandledMessageError({ tag: "BBB" }, ["foo"]),
    unhandledMessageError({ tag: "BBB" }, ["foo"]),
  ]);
});
