import {
createRoot,
update,
defineState,
subscribe,
addListener,
getNestedInstance,
createState,
sendMessage,
stateData,
} from "gurka";
import React    from "react";
import ReactDOM from "react-dom";

// TODO: Fix imports
const { createContext, useContext, useEffect, useState, Component } = React;
const { render } = ReactDOM;

const StateContext = createContext();

const root = createRoot();

[
  "unhandledMessage",
  "stateCreated",
  "stateNewData",
  "messageQueued",
  "messageMatched",
].map(event => addListener(root, event, (...args) => console.log(event, ...args)));

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
  subscriptions: (state)  => { console.log(state); return [
    subscribe(INCREMENT),
    subscribe(DECREMENT),
  ];},
});

const CounterState = createContext();

function CounterStateProvider({ children }) {
  const parent   = useContext(StateContext);
  const instance = getNestedInstance(parent, Counter) || createState(parent, Counter, {});
  // a way to force updates
  const [instanceData, setData] = useState(stateData(instance));

  useEffect(() => {
    function subscription(data) {
      setData(data);
    }

    addListener(instance, "stateNewData", subscription);

    return () => removeListener(instance, "stateNewData", subscription);
  }, [instance])

  return <StateContext.Provider value={instance}>
    <CounterState.Provider value={instanceData}>
      {children}
    </CounterState.Provider>
  </StateContext.Provider>;
}

function Add() {
  const inst = useContext(StateContext);

  return <button onClick={() => sendMessage(inst, increment())}>+</button>;
}

function Sub() {
  const inst = useContext(StateContext);

  return <button onClick={() => sendMessage(inst, decrement())}>-</button>;
}

class RootProvider extends Component {
  // TODO: Register events

  render() {
    return <StateContext.Provider value={this.props.root}>
      {this.props.children}
    </StateContext.Provider>;
  }
}

function App() {
  return <RootProvider root={root}>
    <CounterStateProvider>
      <p>
        <Add />
        <div>
          <CounterState.Consumer>{d => d}</CounterState.Consumer>
        </div>
        <Sub />
      </p>
    </CounterStateProvider>
  </RootProvider>
}

render(<App />, document.getElementById("app"));