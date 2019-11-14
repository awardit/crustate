/* @flow */

import type { Model } from "../src/model";
import type { Message } from "../src/message";

import test from "ava";
import { updateData } from "../src";

// Type tests
type MyMessage = { tag: "a" } | { tag: "b" };
({
  id: "test",
  init: () => updateData("init"),
  update: () => null,
}: Model<string, void, MyMessage>);

test("Model can be instantiated", t => {
  const definition: Model<string, void, Message> = {
    id: "test",
    init: () => updateData("init"),
    update: (data, msg) => updateData(msg.tag),
  };

  t.deepEqual(definition.init(), updateData("init"));
  t.deepEqual(definition.update("init", { tag: "foo" }), updateData("foo"));
});
