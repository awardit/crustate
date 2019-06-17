/* @flow */

import "todomvc-app-css/index.css";

import React from "react";
import ReactDOM from "react-dom";
import { Storage } from "crustate";
import { StorageProvider } from "crustate/react";
import { App } from "./app";
import { TodosState } from "./states/todos";
import { FilterState } from "./states/filter";

const storage = new Storage();

[
  "unhandledMessage",
  "stateCreated",
  "stateNewData",
  "messageQueued",
  "messageMatched",
].map(event => storage.addListener(event, (...args): void => console.log(event, ...args)));

const el = document.getElementById("app");

if( ! el) {
  throw new Error(`Missing <div id="app />`);
}

const root = (
  <StorageProvider storage={storage}>
    <TodosState.Provider>
      <FilterState.Provider>
        <App />
      </FilterState.Provider>
    </TodosState.Provider>
  </StorageProvider>
);

ReactDOM.render(root, el);