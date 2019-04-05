/* @flow */

import type { Init
            , State
            , StateUpdate
            , Subscriptions } from "../src/state";

import ninos            from "ninos";
import test             from "ava";
import { updateData
       , updateAndSend } from "../src/update";
import { subscribe } from "../src/message";

test("State can be instantiated", t => {
  const definition: State<string, void> = {
    name: "test",
    init: () => updateData("init"),
    update: (data, msg) => updateData(msg.tag),
    subscriptions: () => [subscribe("any")],
  };

  t.deepEqual(definition.init(), updateData("init"));
  t.deepEqual(definition.update("init", { tag: "foo" }), updateData("foo"));
  t.deepEqual(definition.subscriptions("init"), [subscribe("any")]);
  t.deepEqual(definition.subscriptions("foo"), [subscribe("any")]);
});