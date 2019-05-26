/* @flow */

import type { Init
            , State
            , StateUpdate
            , Subscriptions } from "../src/state";
import type { Message } from "../src/message";

import ninos            from "ninos";
import test             from "ava";
import { NONE
       , updateData
       , updateAndSend } from "../src/update";

// Type tests
type MyMessage = { tag: "a" } | { tag: "b" };
({
  name: "test",
  init: () => updateData("init"),
  update: (data, msg) => NONE,
  subscriptions: () => ({}),
}: State<string, void, MyMessage>);


test("State can be instantiated", t => {
  const definition: State<string, void, Message> = {
    name: "test",
    init: () => updateData("init"),
    update: (data, msg) => updateData(msg.tag),
    subscriptions: () => ({ any: true }),
  };

  t.deepEqual(definition.init(), updateData("init"));
  t.deepEqual(definition.update("init", { tag: "foo" }), updateData("foo"));
  t.deepEqual(definition.subscriptions("init"), { any: true });
  t.deepEqual(definition.subscriptions("foo"), { any: true });
});