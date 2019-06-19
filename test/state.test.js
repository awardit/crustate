/* @flow */

import type { State } from "../src/state";
import type { Message } from "../src/message";

import test from "ava";
import { NONE, updateData } from "../src/update";

// Type tests
type MyMessage = { tag: "a" } | { tag: "b" };
({
  name: "test",
  init: () => updateData("init"),
  update: () => NONE,
  subscribe: () => ({}),
}: State<string, void, MyMessage>);

test("State can be instantiated", t => {
  const definition: State<string, void, Message> = {
    name: "test",
    init: () => updateData("init"),
    update: (data, msg) => updateData(msg.tag),
    subscribe: () => ({ any: true }),
  };

  t.deepEqual(definition.init(), updateData("init"));
  t.deepEqual(definition.update("init", { tag: "foo" }), updateData("foo"));
  t.deepEqual(definition.subscribe("init"), { any: true });
  t.deepEqual(definition.subscribe("foo"), { any: true });
});
