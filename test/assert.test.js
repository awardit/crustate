/* @flow */

import test            from "ava";
import { debugAssert } from "../src/assert";

test("debugAssert with NODE_ENV = development", t => {
  const oldEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = "development";

  try {
    t.throws(() => debugAssert(false, "it failed"), { message: "Assertion failed: it failed" });
    t.is(debugAssert(true, "it failed"), undefined);
  }
  finally {
    process.env.NODE_ENV = oldEnv;
  }
});

test("debugAssert with NODE_ENV = production", t => {
  const oldEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = "production";

  try {
    t.is(debugAssert(false, "it failed"), undefined);
    t.is(debugAssert(true, "it failed"), undefined);
  }
  finally {
    process.env.NODE_ENV = oldEnv;
  }
});
