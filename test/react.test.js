/* @flow */

import ava from "ava";
import ninos from "ninos";
import { cleanup
       , fireEvent
       , render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import React,
       { Component
       , createContext
       , useState } from "react";
import { Storage
       , updateData } from "../src/index.js";
import { StorageProvider
       , StateContext
       , useSendMessage
       , createStateData
       , useData } from "../react/src/index.js"

// We need to make sure we cleanup after each test, so serial
const test = ninos(ava).serial;

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
test.afterEach.always(cleanup);

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
  const { container } = render(<MyData.TestProvider value={"this is a test"}>
    <MyDataUseDataComponent />
  </MyData.TestProvider>);

  t.is(container.outerHTML, "<div><p>this is a test</p></div>");
});

test("useSendMessage() should still throw inside State.TestProvider", t => {
  t.throws(
    () => render(<MyData.TestProvider value={"this is a test"}>
      <UseSendMessageComponent msg={{ tag: "data", data: "test" }} />
    </MyData.TestProvider>),
    { message: "useSendMessage() must be used inside a <State.Provider />." });
});

test("StateProvider throws when rendered outside of StorageProvider", t => {
  t.throws(
    () => render(<MyData.Provider data="foo"></MyData.Provider>),
    { message: "<state.Provider /> must be used inside a <StorageProvider />" });
});

test("State renders correctly and updates when modified", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, getByText } = render(<StorageProvider storage={s}>
    <MyData.Provider data="initial">
      <MyDataUseDataComponent />
      <UseSendMessageComponent msg={{ tag: "data", data: "the new one" }} />
    </MyData.Provider>
  </StorageProvider>);

  t.is(container.outerHTML, "<div><p>initial</p><a>Foo</a></div>");
  t.deepEqual(s.getSnapshot(), { state: { data: "initial", id: "state", nested: {}, params: { data: "initial" }}});

  const link = getByText("Foo");
  t.not(link, undefined);

  // Click is synchronous and will trigger the sendMessage call
  fireEvent.click(link);

  t.is(container.outerHTML, "<div><p>the new one</p><a>Foo</a></div>");
  t.is(link.outerHTML, "<a>Foo</a>");
  t.deepEqual(s.getSnapshot(), { state: { data: "the new one", id: "state", nested: {}, params: { data: "initial" }}});
  t.is(emit.calls.length, 4);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["state"], { data: "initial" }, "initial"]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "data", data: "the new one" }, ["state", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["messageMatched", { tag: "data", data: "the new one" }, ["state"], false]);
  t.deepEqual(emit.calls[3].arguments, ["stateNewData", "the new one", ["state"], { tag: "data", data: "the new one" }]);
});

test("State is removed when the Provider is unmounted", t => {
  const DoUnmount = ({ children }) => {
    const [show, setShow] = useState(true);

    return <React.Fragment>
      <button type="button" onClick={() => setShow( ! show )}>Toggle</button>
      {show ? children : <p>No render</p>}
    </React.Fragment>;
  };

  const s    = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, getByText } = render(<StorageProvider storage={s}>
    <DoUnmount>
      <MyData.Provider data="my initial"></MyData.Provider>
    </DoUnmount>
  </StorageProvider>);

  t.is(container.outerHTML, `<div><button type="button">Toggle</button></div>`);
  t.deepEqual(s.getSnapshot(), { state: { data: "my initial", id: "state", nested: {}, params: { data: "my initial" }}});

  const btn = getByText("Toggle");
  t.not(btn, undefined);

  fireEvent.click(btn);

  t.is(container.outerHTML, `<div><button type="button">Toggle</button><p>No render</p></div>`);
  t.deepEqual(s.getSnapshot(), {});
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["state"], { data: "my initial" }, "my initial"]);
  t.deepEqual(emit.calls[1].arguments, ["stateRemoved", ["state"], "my initial"]);
});

test("State is reused at the same level", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, getByText } = render(<StorageProvider storage={s}>
    <MyData.Provider data="my initial"><MyDataUseDataComponent /></MyData.Provider>
    <MyData.Provider data="second initial"><MyDataUseDataComponent /></MyData.Provider>
  </StorageProvider>);

  t.is(container.outerHTML, `<div><p>my initial</p><p>my initial</p></div>`);
  t.deepEqual(s.getSnapshot(), { state: { data: "my initial", id: "state", nested: {}, params: { data: "my initial" } }})
  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["state"], { data: "my initial" }, "my initial"]);
});

test("State updates during rendering are respected", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");

  const MyUpdatingComponent = () => {
    const data = useData(MyData);
    const send = useSendMessage();

    if(data !== "updated") {
      // Trigger update while we are rendering
      send({ tag: "data", data: "updated" });
    }

    return <p>{data}</p>;
  };

  const { container, getByText } = render(<StorageProvider storage={s}>
    <MyData.Provider data="my initial"><MyUpdatingComponent /></MyData.Provider>
  </StorageProvider>);

  t.is(container.outerHTML, `<div><p>updated</p></div>`);
  t.deepEqual(s.getSnapshot(), { state: { data: "updated", id: "state", nested: {}, params: { data: "my initial" } }})
  t.is(emit.calls.length, 4);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["state"], { data: "my initial" }, "my initial"]);
  t.deepEqual(emit.calls[1].arguments, ["messageQueued", { tag: "data", data: "updated" }, ["state", "$"]]);
  t.deepEqual(emit.calls[2].arguments, ["messageMatched", { tag: "data", data: "updated" }, ["state"], false]);
  t.deepEqual(emit.calls[3].arguments, ["stateNewData", "updated", ["state"], { tag: "data", data: "updated" }]);
});

test("State is removed when the Provider is the last to be unmounted", t => {
  const DoUnmount = ({ children, text }) => {
    const [show, setShow] = useState(true);

    return <React.Fragment>
      <button type="button" onClick={() => setShow( ! show )}>{text}</button>
      {show ? children : <p>No render</p>}
    </React.Fragment>;
  };

  const s    = new Storage();
  const emit = t.context.spy(s, "emit");

  const { container, getByText } = render(<StorageProvider storage={s}>
    <DoUnmount text="first">
      <MyData.Provider data="my initial"></MyData.Provider>
    </DoUnmount>
    <DoUnmount text="second">
      <MyData.Provider data="second initial"></MyData.Provider>
    </DoUnmount>
  </StorageProvider>);

  t.is(container.outerHTML,
    `<div><button type="button">first</button><button type="button">second</button></div>`);
  t.deepEqual(s.getSnapshot(),
    { state: { data: "my initial", id: "state", nested: {}, params: { data: "my initial" } }});

  const btnFirst = getByText("first");
  t.not(btnFirst, undefined);
  const btnSecond = getByText("second");
  t.not(btnSecond, undefined);

  fireEvent.click(btnFirst);

  t.is(container.outerHTML,
    `<div><button type="button">first</button><p>No render</p><button type="button">second</button></div>`);
  t.deepEqual(s.getSnapshot(),
    { state: { data: "my initial", id: "state", nested: {}, params: { data: "my initial" } }});

  fireEvent.click(btnSecond);

  t.is(container.outerHTML,
    `<div><button type="button">first</button><p>No render</p><button type="button">second</button><p>No render</p></div>`);
  t.deepEqual(s.getSnapshot(), {});
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["state"], { data: "my initial" }, "my initial"]);
  t.deepEqual(emit.calls[1].arguments, ["stateRemoved", ["state"], "my initial"]);
});

test("Rerender should not do anything with the same parameters", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");
  const RerenderComponent = ({ children }) => {
    const [a, setA] = useState(0);

    return <React.Fragment>
      <a onClick={() => setA(a + 1)}>Click</a>
      <MyData.Provider data="the initial">
        {children}
      </MyData.Provider>
    </React.Fragment>;
  };

  const { container, getByText } = render(<StorageProvider storage={s}>
    <RerenderComponent><MyDataUseDataComponent /></RerenderComponent>
  </StorageProvider>);

  t.is(container.outerHTML, `<div><a>Click</a><p>the initial</p></div>`);

  const btn = getByText("Click");
  t.not(btn, undefined);

  fireEvent.click(btn);

  t.is(container.outerHTML, `<div><a>Click</a><p>the initial</p></div>`);
  t.is(emit.calls.length, 1);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["state"], { data: "the initial" }, "the initial"]);
});

test("Rerender without storage should throw", t => {
  const s    = new Storage();
  const emit = t.context.spy(s, "emit");
  const RerenderComponent = ({ children }) => {
    const [localS, setStorage] = useState(s);

    return <StateContext.Provider value={localS}>
      <a onClick={() => setStorage(null)}>Click</a>
      <MyData.Provider data="the initial">
        {children}
      </MyData.Provider>
    </StateContext.Provider>;
  };

  const { container, getByText } = render(<RerenderComponent><MyDataUseDataComponent /></RerenderComponent>);

  t.is(container.outerHTML, `<div><a>Click</a><p>the initial</p></div>`);

  const btn = getByText("Click");
  t.not(btn, undefined);

  t.throws(() => fireEvent.click(btn), { message: "<state.Provider /> must be used inside a <StorageProvider />" });
  t.is(emit.calls.length, 2);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["state"], { data: "the initial" }, "the initial"]);
  // More of an implementation detail of React in that it unmounts the components that threw
  t.deepEqual(emit.calls[1].arguments, ["stateRemoved", ["state"], "the initial"]);
});

test("Rerender with new storage should recreate the state instance in the new storage", t => {
  const sA    = new Storage();
  const sB    = new Storage();
  const emitA = t.context.spy(sA, "emit");
  const emitB = t.context.spy(sB, "emit");
  const RerenderComponent = ({ children }) => {
    const [localS, setStorage] = useState(sA);

    return <StateContext.Provider value={localS}>
      <a onClick={() => setStorage(sB)}>Click</a>
      <MyData.Provider data="the initial">
        {children}
      </MyData.Provider>
    </StateContext.Provider>;
  };

  const { container, getByText } = render(<RerenderComponent><MyDataUseDataComponent /></RerenderComponent>);

  t.is(container.outerHTML, `<div><a>Click</a><p>the initial</p></div>`);

  const btn = getByText("Click");
  t.not(btn, undefined);

  fireEvent.click(btn);

  t.is(container.outerHTML, `<div><a>Click</a><p>the initial</p></div>`);
  t.is(emitA.calls.length, 2);
  t.deepEqual(emitA.calls[0].arguments, ["stateCreated", ["state"], { data: "the initial" }, "the initial"]);
  t.deepEqual(emitA.calls[1].arguments, ["stateRemoved", ["state"], "the initial"]);
  t.is(emitB.calls.length, 1);
  t.deepEqual(emitB.calls[0].arguments, ["stateCreated", ["state"], { data: "the initial" }, "the initial"]);
});

test("Varying name property will recreate the state instance", t => {
  const s       = new Storage();
  const emit    = t.context.spy(s, "emit");
  const Wrapper = ({ children }) => {
    const [key, setKey] = useState("a");

    return <StateContext.Provider value={s}>
      <a onClick={() => setKey("b")}>Click</a>
      <MyData.Provider name={key} data={key}>
        {children}
      </MyData.Provider>
    </StateContext.Provider>;
  };

  const { container, getByText } = render(<Wrapper><MyDataUseDataComponent /></Wrapper>);

  t.is(container.outerHTML, `<div><a>Click</a><p>a</p></div>`);

  const btn = getByText("Click");
  t.not(btn, undefined);

  fireEvent.click(btn);

  t.is(container.outerHTML, `<div><a>Click</a><p>b</p></div>`);

  t.is(emit.calls.length, 3);
  t.deepEqual(emit.calls[0].arguments, ["stateCreated", ["a"], { data: "a" }, "a"]);
  t.deepEqual(emit.calls[1].arguments, ["stateCreated", ["b"], { data: "b" }, "b"]);
  t.deepEqual(emit.calls[2].arguments, ["stateRemoved", ["a"], "a"]);
});