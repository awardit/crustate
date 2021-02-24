/* @flow */

import type { Model } from "../src";

import ava from "ava";
import ninos from "ninos";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import React from "react";
import { Storage, updateData } from "../src";
import {
  StorageProvider,
  StateContext,
  useSendMessage,
  createStateData,
  useData,
} from "../react/src";
import { args, unhandledMessageError } from "./util";

type UpdateMsg = { tag: "data", data: string };

// We need to make sure we cleanup after each test, so serial
const test = ninos(ava).serial;

function init() {
  cleanup();

  const { window } = new JSDOM(`<!doctype html><html><body></body></html>`);

  global.window = window;
  global.document = window.document;
  global.navigator = {
    userAgent: "node.js",
  };

  global.requestAnimationFrame = cb => setTimeout(cb, 0);
  global.cancelAnimationFrame = cb => clearTimeout(cb);
}

test.beforeEach(init);
test.afterEach.always(cleanup);

const MyData = createStateData<Model<string, { test?: boolean, data: string }, UpdateMsg>>({
  id: "state",
  init: ({ data }) => updateData(data),
  update: (_, msg) => msg.tag === "data" ? updateData(msg.data) : null,
});

// Type tests
// $FlowFixMe[prop-missing]
(<StorageProvider />);
// $FlowFixMe[incompatible-type]
(<StorageProvider storage={null} />);
// $FlowFixMe[prop-missing]
(<MyData.TestProvider />);
// $FlowFixMe[prop-missing]
(<MyData.TestProvider>testing</MyData.TestProvider>);
// $FlowFixMe[incompatible-type]
(<MyData.TestProvider value={null}>testing</MyData.TestProvider>);
(<MyData.TestProvider value="foo">testing</MyData.TestProvider>);
(() => {
  // Testing some stuff which we cannot run
  // $FlowFixMe[incompatible-cast]
  (useData(MyData): number);

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
  t.throws(
    () => render(<MyDataUseDataComponent />),
    { message: "useData(state) must be used inside a <state.Provider />" });
});

test("useSendMessage() must be used inside a Component", t => {
  t.throws(
    () => render(<UseSendMessageComponent msg={{ tag: "data", data: "test" }} />),
    { message: "useSendMessage() must be used inside a <State.Provider />." });
});

test("State.TestProvider should set the value", t => {
  const { container } = render(
    <MyData.TestProvider value="this is a test">
      <MyDataUseDataComponent />
    </MyData.TestProvider>);

  t.is(container.outerHTML, "<div><p>this is a test</p></div>");
});

test("useSendMessage() should still throw inside State.TestProvider", t => {
  t.throws(
    () => render(
      <MyData.TestProvider value="this is a test">
        <UseSendMessageComponent msg={{ tag: "data", data: "test" }} />
      </MyData.TestProvider>),
    { message: "useSendMessage() must be used inside a <State.Provider />." });
});

test("StateProvider throws when rendered outside of StorageProvider", t => {
  t.throws(
    () => render(<MyData.Provider data="foo" />),
    { message: "<state.Provider /> must be used inside a <StorageProvider />" });
});

test("State renders correctly and updates when modified", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, getByText } = render(
    <StorageProvider storage={s}>
      <MyData.Provider data="initial">
        <MyDataUseDataComponent />
        <UseSendMessageComponent msg={{ tag: "data", data: "the new one" }} />
      </MyData.Provider>
    </StorageProvider>);

  t.is(container.outerHTML, "<div><p>initial</p><a>Foo</a></div>");
  t.deepEqual(s.getSnapshot(), { state: { data: "initial", id: "state", nested: {} } });

  const link = getByText("Foo");
  t.not(link, undefined);

  // Click is synchronous and will trigger the sendMessage call
  fireEvent.click(link);

  t.is(container.outerHTML, "<div><p>the new one</p><a>Foo</a></div>");
  t.is(link.outerHTML, "<a>Foo</a>");
  t.deepEqual(s.getSnapshot(), { state: { data: "the new one", id: "state", nested: {} } });
  t.deepEqual(args(emit), [
    ["stateCreated", ["state"], { data: "initial" }, "initial"],
    ["messageQueued", { tag: "data", data: "the new one" }, ["state", "$"]],
    ["messageMatched", { tag: "data", data: "the new one" }, ["state"]],
    ["stateNewData", "the new one", ["state"], { tag: "data", data: "the new one" }],
  ]);
});

test("sendMessage should have a path", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  const { container, getByText } = render(
    <StorageProvider storage={s}>
      <UseSendMessageComponent msg={{ tag: "data", data: "whatevs" }} />
    </StorageProvider>);

  t.is(container.outerHTML, "<div><a>Foo</a></div>");

  const link = getByText("Foo");
  t.not(link, undefined);

  // Click is synchronous and will trigger the sendMessage call
  fireEvent.click(link);

  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "data", data: "whatevs" }, ["$"]],
    ["unhandledMessage", { tag: "data", data: "whatevs" }, ["$"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "data", data: "whatevs" }, ["$"]),
  ]);
});

test("sendMessage should be able to set a path", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");
  const error = t.context.spy(console, "error", () => {});

  const { container, getByText } = render(
    <StorageProvider storage={s}>
      <UseSendMessagePathComponent msg={{ tag: "data", data: "whatevs" }} path="aaaaa" />
    </StorageProvider>);

  t.is(container.outerHTML, "<div><a>Foo</a></div>");

  const link = getByText("Foo");
  t.not(link, undefined);

  // Click is synchronous and will trigger the sendMessage call
  fireEvent.click(link);

  t.deepEqual(args(emit), [
    ["messageQueued", { tag: "data", data: "whatevs" }, ["aaaaa"]],
    ["unhandledMessage", { tag: "data", data: "whatevs" }, ["aaaaa"]],
  ]);
  t.deepEqual(args(error), [
    unhandledMessageError({ tag: "data", data: "whatevs" }, ["aaaaa"]),
  ]);
});

test("State is removed when the Provider is unmounted", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, rerender } = render(
    <StorageProvider storage={s}>
      <MyData.Provider data="my initial" />
    </StorageProvider>);

  t.is(container.outerHTML, `<div></div>`);
  t.deepEqual(s.getSnapshot(), { state: { data: "my initial", id: "state", nested: {} } });

  rerender(
    <StorageProvider storage={s} />
  );

  t.is(container.outerHTML, `<div></div>`);
  t.deepEqual(s.getSnapshot(), {});
  t.deepEqual(args(emit), [
    ["stateCreated", ["state"], { data: "my initial" }, "my initial"],
    ["stateRemoved", ["state"], "my initial"],
  ]);
});

test("State is reused at the same level", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container } = render(
    <StorageProvider storage={s}>
      <MyData.Provider data="my initial"><MyDataUseDataComponent /></MyData.Provider>
      <MyData.Provider data="second initial"><MyDataUseDataComponent /></MyData.Provider>
    </StorageProvider>);

  t.is(container.outerHTML, `<div><p>my initial</p><p>my initial</p></div>`);
  t.deepEqual(s.getSnapshot(), { state: { data: "my initial", id: "state", nested: {} } });
  t.deepEqual(args(emit), [
    ["stateCreated", ["state"], { data: "my initial" }, "my initial"],
  ]);
});

test("State updates during rendering are respected", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  const MyUpdatingComponent = () => {
    const data = useData(MyData);
    const send = useSendMessage();

    if (data !== "updated") {
      // Trigger update while we are rendering
      send({ tag: "data", data: "updated" });
    }

    return <p>{data}</p>;
  };

  const { container } = render(
    <StorageProvider storage={s}>
      <MyData.Provider data="my initial"><MyUpdatingComponent /></MyData.Provider>
    </StorageProvider>);

  t.is(container.outerHTML, `<div><p>updated</p></div>`);
  t.deepEqual(s.getSnapshot(), { state: { data: "updated", id: "state", nested: {} } });
  t.deepEqual(args(emit), [
    ["stateCreated", ["state"], { data: "my initial" }, "my initial"],
    ["messageQueued", { tag: "data", data: "updated" }, ["state", "$"]],
    ["messageMatched", { tag: "data", data: "updated" }, ["state"]],
    ["stateNewData", "updated", ["state"], { tag: "data", data: "updated" }],
  ]);
});

test("State is removed when the Provider is the last to be unmounted", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, rerender } = render(
    <StorageProvider storage={s}>
      <MyData.Provider data="my initial" />
      <MyData.Provider data="second initial" />
    </StorageProvider>);

  t.is(container.outerHTML,
    `<div></div>`);
  t.deepEqual(s.getSnapshot(),
    { state: { data: "my initial", id: "state", nested: {} } });

  rerender(
    <StorageProvider storage={s}>
      <MyData.Provider data="second initial" />
    </StorageProvider>);

  t.is(container.outerHTML, `<div></div>`);
  t.deepEqual(s.getSnapshot(),
    { state: { data: "my initial", id: "state", nested: {} } });

  rerender(<StorageProvider storage={s} />);

  t.is(container.outerHTML, `<div></div>`);
  t.deepEqual(s.getSnapshot(), {});
  t.deepEqual(args(emit), [
    ["stateCreated", ["state"], { data: "my initial" }, "my initial"],
    ["stateRemoved", ["state"], "my initial"],
  ]);
});

test("Rerender should not do anything with the same parameters", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, rerender } = render(
    <StorageProvider storage={s}>
      <MyData.Provider data="the initial">
        <MyDataUseDataComponent />
      </MyData.Provider>
    </StorageProvider>);

  t.is(container.outerHTML, `<div><p>the initial</p></div>`);

  rerender(
    <StorageProvider storage={s}>
      <MyData.Provider data="the initial">
        <MyDataUseDataComponent />
      </MyData.Provider>
    </StorageProvider>);

  t.is(container.outerHTML, `<div><p>the initial</p></div>`);
  t.deepEqual(args(emit), [
    ["stateCreated", ["state"], { data: "the initial" }, "the initial"],
  ]);
});

test("Rerender without storage should throw", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, rerender } = render(
    <StateContext.Provider value={s}>
      <MyData.Provider data="the initial">
        <MyDataUseDataComponent />
      </MyData.Provider>
    </StateContext.Provider>);

  t.is(container.outerHTML, `<div><p>the initial</p></div>`);

  t.throws(() => rerender(
    <StateContext.Provider value={null}>
      <MyData.Provider data="the initial">
        <MyDataUseDataComponent />
      </MyData.Provider>
    </StateContext.Provider>), { message: "<state.Provider /> must be used inside a <StorageProvider />" });

  t.deepEqual(args(emit), [
    ["stateCreated", ["state"], { data: "the initial" }, "the initial"],
    // More of an implementation detail of React in that it unmounts the
    // components that threw
    ["stateRemoved", ["state"], "the initial"],
  ]);
});

test("Rerender with new storage should recreate the state instance in the new storage", t => {
  const sA = new Storage();
  const sB = new Storage();
  const emitA = t.context.spy(sA, "emit");
  const emitB = t.context.spy(sB, "emit");

  const { container, rerender } = render(
    <StateContext.Provider value={sA}>
      <MyData.Provider data="the initial">
        <MyDataUseDataComponent />
      </MyData.Provider>
    </StateContext.Provider>);

  t.is(container.outerHTML, `<div><p>the initial</p></div>`);

  rerender(
    <StateContext.Provider value={sB}>
      <MyData.Provider data="the initial">
        <MyDataUseDataComponent />
      </MyData.Provider>
    </StateContext.Provider>);

  t.is(container.outerHTML, `<div><p>the initial</p></div>`);
  t.deepEqual(args(emitA), [
    ["stateCreated", ["state"], { data: "the initial" }, "the initial"],
    ["stateRemoved", ["state"], "the initial"],
  ]);
  t.deepEqual(args(emitB), [["stateCreated", ["state"], { data: "the initial" }, "the initial"]]);
});

test("Varying name property will recreate the state instance", t => {
  const s = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, rerender } = render(
    <StateContext.Provider value={s}>
      <MyData.Provider name="a" data="aData">
        <MyDataUseDataComponent />
      </MyData.Provider>
    </StateContext.Provider>);

  t.is(container.outerHTML, `<div><p>aData</p></div>`);

  rerender(
    <StateContext.Provider value={s}>
      <MyData.Provider name="b" data="bData">
        <MyDataUseDataComponent />
      </MyData.Provider>
    </StateContext.Provider>);

  t.is(container.outerHTML, `<div><p>bData</p></div>`);

  t.deepEqual(args(emit), [
    ["stateCreated", ["a"], { data: "aData" }, "aData"],
    ["stateCreated", ["b"], { data: "bData" }, "bData"],
    ["stateRemoved", ["a"], "aData"],
  ]);
});

test("useSendMessage always returns the same callback instance", t => {
  const s = new Storage();

  const MyComponent = () => {
    const [counter, setCounter] = React.useState(0);
    const send = useSendMessage();

    React.useEffect(() => setCounter(c => c + 1), [setCounter, send]);

    if (counter > 1) {
      throw new Error("We updated more than one extra time");
    }

    return <p>{counter}</p>;
  };

  const { container } = render(
    <StateContext.Provider value={s}>
      <MyComponent />
    </StateContext.Provider>);

  t.is(container.outerHTML, `<div><p>1</p></div>`);
});
