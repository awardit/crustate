/* @flow */

import type { StatePath }   from "crustate";
import type { DataRequest } from "./effects";

import { Storage
       , subscribe }     from "crustate";
import React             from "react";
import { render }        from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App               from "./app";
import { PostList }      from "./state";

const basename   = window.routerBasename;
const storage    = new Storage();
const subscriber = (msg: DataRequest, source: StatePath) => {
  switch(msg.resource) {
  case "list":
    // TODO: Generalize this:
    fetch(`${basename}/api/posts`).then(r => r.json()).then(
      // TODO: How can we type this to ensure we reply with the correct message type?
      data => storage.replyMessage({ tag: "effects/response/list", data }, source),
      error => storage.replyMessage({ tag: "effects/response/list", error: String(error) }, source));
    break;
  case "post":
    fetch(`${basename}/api/posts/${msg.id}`).then(r => r.json()).then(
      data => storage.replyMessage({ tag: "effects/response/post", data }, source),
      error => storage.replyMessage({ tag: "effects/response/post", error: String(error) }, source));
    break;
  }
};

// TODO: How to properly type this? Can we come up with a solution which
//       also works for the problem with State.subscribers?
storage.addSubscriber((subscriber: any), [subscribe("effects/request")]);

// Register the possible states we might restore when we call restoreSnapshot();
storage.registerState(PostList.state);

// TODO: Implement restoreSnapshot
/*
if(window.appdata) {
  storage.restoreSnapshot(window.appdata);
}
*/

// Set storage on window so we can inspect it
window.appState = storage;

const element = document.getElementById("app");

if( ! element) {
  throw new Error("Example: #app element was not found");
}

render(<BrowserRouter basename={basename}>
  <App storage={storage} />
</BrowserRouter>, element);