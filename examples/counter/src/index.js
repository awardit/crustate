/* @flow */
import { NONE
       , updateData
       , Storage } from "crustate";
import { StorageProvider
       , useData
       , useSendMessage
       , createStateData } from "crustate/react";
import React    from "react";
import ReactDOM from "react-dom";

const INCREMENT = "increment";
const DECREMENT = "decrement";

const CounterData = createStateData({
  name: "counter",
  init: ({ initial = 0 }: { initial?: number }) => updateData(initial),
  update: (state, msg) => {
    switch(msg.tag) {
    case INCREMENT:
      return updateData(state + 1);
    case DECREMENT:
      return updateData(state - 1);
    }

    return NONE;
  },
  subscribe: (state) => state < 0 ? {} : {
    [INCREMENT]: true,
    [DECREMENT]: true,
  },
});

function TheCounter() {
  const sendMessage = useSendMessage();
  const value       = useData(CounterData);

  return <div>
    <button onClick={() => sendMessage({ tag: INCREMENT })}>+</button>
    <p>{value}</p>
    <button onClick={() => sendMessage({ tag: DECREMENT })}>-</button>
  </div>;
}

function App() {
  return <StorageProvider storage={storage}>
    <CounterData.Provider>
      <TheCounter />
    </CounterData.Provider>
  </StorageProvider>
}

const storage = new Storage();

[
  "unhandledMessage",
  "stateCreated",
  "stateNewData",
  "messageQueued",
  "messageMatched",
].map(event => storage.addListener(event, (...args) => console.log(event, ...args)));

const el = document.getElementById("app");

if( ! el) {
  throw new Error(`Missing <div id="app />`);
}

ReactDOM.render(<App />, el);