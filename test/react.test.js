/* @flow */

import test from "ava";
import { render, cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";
import React, { Component, createContext } from "react";
import { updateData } from "../src/index.js";
import { StateContext
       , useSendMessage
       , createStateData
       , useData } from "../react/src/index.js"

function init() {
  cleanup();

  const { window } = new JSDOM(`<!doctype html><html><body></body></html>`);

  global.window   = window;
  global.document = window.document;
  global.navigator = {
    userAgent: "node.js",
  };

  global.requestAnimationFrame = cb => setTimeout(cb, 0);
  global.cancelAnimationFrame  = cb => clearTimeout(cb);
}

test.beforeEach(init);
test.afterEach(cleanup);

type UpdateMsg = { tag: "data", data: string };

const MyData = createStateData<string, { test?: boolean, data: string }, UpdateMsg>({
  name:      "state",
  init:      ({ data }) => updateData(data),
  update:    (_, msg) => updateData(msg.data),
  subscribe: () => ({ data: true }),
});

// Type tests
// $ExpectError
(<MyData.TestProvider />);
// $ExpectError
(<MyData.TestProvider>testing</MyData.TestProvider>);
// $ExpectError
(<MyData.TestProvider value={null}>testing</MyData.TestProvider>);
(<MyData.TestProvider value={"foo"}>testing</MyData.TestProvider>);
(() => {
  // Testing some stuff which we cannot run
  // $ExpectError
  const data: number = useData(MyData);
});

const MyDataUseDataComponent = () => {
  const data: string = useData(MyData);

  return <p>{data}</p>;
};

test("useData() must be used inside a Component", t => {
  t.throws(() => render(<MyDataUseDataComponent />), { message: "useData(state) must be used inside a <state.Provider />" });
});

test("useSendMessage() must be used inside a Component", t => {
  const C = () => {
    const data = useSendMessage();

    return <p>Foo</p>;
  };
  t.throws(() => render(<C />), { message: "useSendMessage() must be used inside a <State.Provider />." });
});

test("State.TestProvider should set the value", t => {
  const { container } = render(<MyData.TestProvider value={"this is a test"}><MyDataUseDataComponent /></MyData.TestProvider>);

  t.is(container.outerHTML, "<div><p>this is a test</p></div>");
});

test.todo("basic state")