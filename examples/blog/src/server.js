/* @flow */

import type { Post
            , PostHeading } from "./effects";

import express        from "express";
import { Storage }    from "crustate";
import React          from "react";
import ReactDomServer from "react-dom/server";
import App            from "./app";

// Create a router only since We run this file through the main
// `examples/index.js` application
const app = express.Router();

function listPosts(cb: (error: boolean, posts: Array<PostHeading>) => mixed) {
  cb(false, [{ id: 1, title: "Post one"}, { id: 2, title: "Post B" }]);
}

function getPost(id: number, cb: ((error: true) => mixed) & (error: false, post: Post) => mixed) {
  // TODO: Implement
  switch(id) {
  case 1:
    return cb(false, { title: "Post one", body: "This is the first post", author: "Test", date: new Date() });
  case 2:
    return cb(false, { title: "Post one", body: "This is the first post", author: "Martin", date: new Date() });
  default:
    return cb(true);
  }
}

app.get("/api/posts", (req, res) => listPosts((error, posts) => error
  ? res.status(500).send(error)
  : res.json(posts)));
app.get("/api/posts/:id", (req, res) => getPost(req.params.id, (error, post) => error
  ? res.status(404).end()
  : res.json(post)));

app.use((req, res, next) => {
  const storage = new Storage();

  // TODO: Register the fetch-methods

  res.locals.storage = storage;

  next();
});

// app.get("/:id", (req, res) => { });

app.get("/", (req, res) => {
  ReactDomServer.renderToString(<App storage={res.locals.storage} />);

  res.send("Foobar");
});

export default app;