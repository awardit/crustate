/* @flow */
import { NONE
       , updateData
       , subscribe
       , Storage } from "crustate";
import { StorageProvider } from "crustate/react";
import { TodosState } from "./states/todos";
import { FilterState } from "./states/filter";
import React    from "react";
import ReactDOM from "react-dom";
import "todomvc-app-css/index.css";

import { App } from "./app";

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

ReactDOM.render(<StorageProvider value={storage}>
  <TodosState.Provider>
    <FilterState.Provider>
      <App />
    </FilterState.Provider>
  </TodosState.Provider>
</StorageProvider>, el);
