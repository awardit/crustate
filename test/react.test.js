
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
  global.cancelAnimationFrame  = cb => clearTimeout(cb, 0);
}

test.beforeEach(init);
test.afterEach(cleanup);

const MyData = createStateData({
  name:      "state",
  init:      updateData,
  update:    (_, msg) => updateData(msg.data),
  subscribe: () => { data: true },
});

test("useData() must be used inside a Component", t => {
  const C = () => {
    const data = useData(MyData);

    return <p>{JSON.stringify(data)}</p>;
  };
  t.throws(() => render(<C />), { message: "useData(state) must be used inside a <state.Provider />" });
});

test("useSendMessage() must be used inside a Component", t => {
  const C = () => {
    const data = useSendMessage();

    return <p>Foo</p>;
  };
  t.throws(() => render(<C />), { message: "useSendMessage() must be used inside a <State.Provider />." });
});

test.todo("basic state")