/* @flow */

import test from "ava";
import { cleanup
       , fireEvent
       , render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import React, { Component, createContext } from "react";
import { Storage
       , updateData } from "../src/index.js";
import { StorageProvider
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
(<StorageProvider></StorageProvider>);
// $ExpectError
(<StorageProvider storage={null} />);
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

  // $ExpectError
  (<StorageProvider storage={new Storage()} />);
  (<StorageProvider storage={new Storage()}>test</StorageProvider>);
});

const MyDataUseDataComponent = () => {
  const data: string = useData(MyData);

  return <p>{data}</p>;
};
const UseSendMessageComponent = ({ msg }: { msg: UpdateMsg }) => {
  const send = useSendMessage();

  return <a onClick={() => send(msg)}>Foo</a>;
};
const UseSendMessagePathComponent = ({ msg, path }: { msg: UpdateMsg, path: string }) => {
  const send = useSendMessage();

  return <a onClick={() => send(msg, path)}>Foo</a>;
};

test("useData() must be used inside a Component", t => {
  t.throws(() => render(<MyDataUseDataComponent />), { message: "useData(state) must be used inside a <state.Provider />" });
});

test("useSendMessage() must be used inside a Component", t => {
  t.throws(() => render(<UseSendMessageComponent msg={{ tag: "data", data: "test" }} />), { message: "useSendMessage() must be used inside a <State.Provider />." });
});

test("State.TestProvider should set the value", t => {
  const { container } = render(<MyData.TestProvider value={"this is a test"}><MyDataUseDataComponent /></MyData.TestProvider>);

  t.is(container.outerHTML, "<div><p>this is a test</p></div>");
});

test("useSendMessage() should still throw inside State.TestProvider", t => {
  t.throws(() => render(<MyData.TestProvider value={"this is a test"}><UseSendMessageComponent msg={{ tag: "data", data: "test" }} /></MyData.TestProvider>), { message: "useSendMessage() must be used inside a <State.Provider />." });
});

test("State renders correctly and updates when modified", t => {
  const s = new Storage();

  const { container, getByText } = render(<StorageProvider storage={s}>
    <MyData.Provider data="initial">
      <MyDataUseDataComponent />
      <UseSendMessageComponent msg={{ tag: "data", data: "the new one" }} />
    </MyData.Provider>
  </StorageProvider>);

  t.is(container.outerHTML, "<div><p>initial</p><a>Foo</a></div>")
  t.deepEqual(s.getSnapshot(), { state: { data: "initial", defName: "state", nested: {}, params: { data: "initial" } }})

  const link = getByText("Foo");
  t.not(link, undefined);

  fireEvent.click(link);

  t.is(container.outerHTML, "<div><p>the new one</p><a>Foo</a></div>")
  t.is(link.outerHTML, "<a>Foo</a>");
  t.deepEqual(s.getSnapshot(), { state: { data: "the new one", defName: "state", nested: {}, params: { data: "initial" } }})
});

test.todo("more advanced state")
test.todo("Edge case when state-data is updated as we are rendering")