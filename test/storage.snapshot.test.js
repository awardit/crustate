/* @flow */

import ninos from "ninos";
import ava from "ava";
import { Storage } from "../src/storage";
import { updateData } from "../src/update";

const test = ninos(ava);
const args = f => f.calls.map(c => c.arguments);

test("restoreSnapshot throws if it cannot find a matching state definition", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.throws(() => s.restoreSnapshot({ foo: { id: "bar", data: null, nested: {} } }), { message: "Missing model for state 'bar'." });

  t.deepEqual(args(emit), [
    ["snapshotRestore", { foo: { id: "bar", data: null, nested: {} } }],
  ]);
});

test("restoreSnapshot works on empty", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  t.deepEqual(s.getSnapshot(), { });

  s.restoreSnapshot({ });

  t.deepEqual(s.getSnapshot(), { });

  t.deepEqual(args(emit), [
    ["snapshotRestore", {}],
    ["snapshotRestored"],
  ]);
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

  s.restoreSnapshot({ foo: { id: "foo", data: 3, nested: {} } });

  t.deepEqual(s.getSnapshot(), { foo: { id: "foo", data: 3, nested: {} } });

  t.not(s.getState(d), undefined);
  t.deepEqual((s.getState(d): any).getData(), 3);

  t.deepEqual(args(emit), [
    ["snapshotRestore", { foo: { id: "foo", data: 3, nested: {} } }],
    ["snapshotRestored"],
  ]);
  t.deepEqual(args(init), []);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
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

  s.restoreSnapshot({ foo: { id: "bar", data: 3, nested: {} } });

  t.deepEqual(s.getSnapshot(), { foo: { id: "bar", data: 3, nested: {} } });

  t.not(s.getState(d, "foo"), undefined);

  t.deepEqual(args(emit), [
    ["snapshotRestore", { foo: { id: "bar", data: 3, nested: {} } }],
    ["snapshotRestored"],
  ]);
  t.deepEqual(args(init), []);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
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

  s.restoreSnapshot({ foo: { id: "foo", data: 3, nested: { foo: { id: "foo", data: 5, nested: {} } } } });

  t.deepEqual(s.getSnapshot(), { foo: { id: "foo", data: 3, nested: { foo: { id: "foo", data: 5, nested: {} } } } });

  t.not(s.getState(d), undefined);
  t.deepEqual((s.getState(d): any).getData(), 3);
  t.not((s.getState(d): any).getState(d), undefined);
  t.deepEqual(((s.getState(d): any).getState(d): any).getData(), 5);

  t.deepEqual(args(emit), [
    ["snapshotRestore", { foo: { id: "foo", data: 3, nested: { foo: { id: "foo", data: 5, nested: {} } } } }],
    ["snapshotRestored"],
  ]);
  t.deepEqual(args(init), []);
  t.deepEqual(args(update), []);
  t.deepEqual(args(subscribe), []);
});
