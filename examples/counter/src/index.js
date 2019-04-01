/* @flow */
import { createRoot
       , update
       , defineState
       , subscribe
       , addListener } from "gurka";
import { RootProvider
       , useSendMessage
       , createReactState } from "gurka/react";
import React    from "react";
import ReactDOM from "react-dom";

const { render } = ReactDOM;

const INCREMENT = "increment";
const DECREMENT = "decrement";

const increment = () => ({ tag: INCREMENT });
const decrement = () => ({ tag: DECREMENT });

const Counter   = defineState("counter", {
  init: ({ initial = 0 }) => update(initial),
  receive: (state, msg)   => {
    switch(msg.tag) {
    case INCREMENT:
      return update(state + 1);
    case DECREMENT:
      return update(state - 1);
     }
  },
  subscriptions: (state)  => state < 0 ? [] : [
    subscribe(INCREMENT),
    subscribe(DECREMENT),
  ],
});

const { Provider: CounterProvider, useData: useCounterData } = createReactState(Counter);
const root = createRoot();

[
  "unhandledMessage",
  "stateCreated",
  "stateNewData",
  "messageQueued",
  "messageMatched",
].map(event => addListener(root, event, (...args) => console.log(event, ...args)));

function ACounter() {
  const sendMessage = useSendMessage();
  const value       = useCounterData();

  return <div>
    <button onClick={() => sendMessage(increment())}>+</button>
    <p>{value}</p>
    <button onClick={() => sendMessage(decrement())}>-</button>
  </div>;
}

function App() {
  return <RootProvider value={root}>
    <CounterProvider>
      <ACounter />
    </CounterProvider>
  </RootProvider>
}

render(<App />, document.getElementById("app"));