/* @flow */

import type { StatePath } from "crustate";
import type { DataRequest } from "./effects";

import { Storage } from "crustate";
import React from "react";
import { render } from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./app";
import { PostData, PostListData } from "./state";

const basename = window.routerBasename;
const storage = new Storage();
const subscriber = (msg: DataRequest, source: StatePath) => {
  switch(msg.resource) {
  case "list":
    // TODO: Generalize this:
    fetch(`${basename}/api/posts`).then(r => r.json()).then(
      // TODO: How can we type this to ensure we reply with the correct
      //       message type?
      data => storage.replyMessage({ tag: "effects/response/list", data }, source),
      e => storage.replyMessage({ tag: "effects/response/list", error: String(e) }, source));
    break;
  case "post":
    fetch(`${basename}/api/posts/${msg.id}`).then(r => r.json()).then(
      data => storage.replyMessage({ tag: "effects/response/post", data }, source),
      e => storage.replyMessage({ tag: "effects/response/post", error: String(e) }, source));
    break;
  default:
    throw new Error(`Unknown resource '${msg.resource}'.`);
  }
};

// TODO: Currently not a type-safe way of registering listeners
const events = {
  unhandledMessage: "warn",
  stateCreated: "info",
  stateRemoved: "info",
  stateNewData: "info",
  snapshotRestore: "info",
  messageQueued: "info",
  messageMatched: "debug",
  snapshotRestored: "debug",
};

Object.keys(events).forEach(eventName => {
  const level = events[eventName];

  storage.addListener((eventName: any), (...data) => console[level](eventName, ...data));
});

storage.addSubscriber(subscriber, { "effects/request": true });

// Register the possible states we might restore when we call restoreSnapshot();
storage.addModel(PostListData.model);
storage.addModel(PostData.model);

if(window.appdata) {
  storage.restoreSnapshot(window.appdata);
}

// Set storage on window so we can inspect it
window.appState = storage;

const element = document.querySelector("#app");

if( ! element) {
  throw new Error("Example: #app element was not found");
}

const root = (
  <BrowserRouter basename={basename}>
    <App storage={storage} />
  </BrowserRouter>
);

render(root, element);
