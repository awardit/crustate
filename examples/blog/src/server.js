/* @flow */

import type { StatePath } from "crustate";
import type { DataRequest } from "./effects";
import type { Post, PostHeading } from "./state";

import { StaticRouter } from "react-router";
import express from "express";
import { Storage } from "crustate";
import React from "react";
import ReactDomServer from "react-dom/server";
import { App } from "./app";

// Create a router only since We run this file through the main
// `examples/index.js` application
const app = new express.Router();

function listPosts(cb: (error: boolean, posts: Array<PostHeading>) => mixed) {
  cb(false, [{ id: 1, title: "Post one" }, { id: 2, title: "Post B" }]);
}

function getPost(id: number, cb: ((error: true) => mixed) & (error: false, post: Post) => mixed) {
  // TODO: Implement
  switch (id) {
    case 1:
      return cb(false, {
        id: 1,
        title: "Post one",
        body: "This is the first post",
        author: "Test",
        date: new Date(),
      });
    case 2:
      return cb(false, {
        id: 2,
        title: "Post B",
        body: "This is another post",
        author: "Martin",
        date: new Date(),
      });
    default:
      return cb(true);
  }
}

/**
 * Server version of the request handler.
 */
function createRequestHandler(storage: Storage) {
  let waiting = 0;
  const resolvers = [];
  const finish = () => {
    waiting -= 1;

    if (waiting === 0) {
      while (resolvers.length) {
        resolvers.pop()();
      }
    }
  };

  const effect = (msg: DataRequest, source: StatePath) => {
    switch (msg.resource) {
      case "list":
      // TODO: Generalize
        waiting += 1;

        listPosts((error, data) => {
          if (error) {
          // TODO: How can we type this to ensure we reply with the correct
          //       message type?
            storage.replyMessage({ tag: "effects/response/list", error }, source);
          }
          else {
            storage.replyMessage({ tag: "effects/response/list", data }, source);
          }

          finish();
        });
        break;
      case "post":
        waiting += 1;

        getPost(msg.id, (error, data) => {
          if (error) {
            storage.replyMessage({ tag: "effects/response/post", error }, source);
          }
          else {
            storage.replyMessage({ tag: "effects/response/post", data }, source);
          }

          finish();
        });
        break;
      default:
        throw new Error(`Unknown resource '${msg.resource}'.`);
    }
  };

  storage.addEffect({ effect, subscribe: { "effects/request": true } });

  return {
    waitForAll: () => new Promise(resolve => waiting ? resolvers.push(resolve) : resolve()),
  };
}

app.get("/api/posts", (req, res) =>
  listPosts((error, posts) => error ?
    res.status(500).send(error) :
    res.json(posts)));
app.get("/api/posts/:id", (req, res) =>
  getPost(parseInt(req.params.id, 10), (error, post) => error ?
    res.status(404).end() :
    res.json(post)));

app.use((req, res, next) => {
  const storage = new Storage();
  const effects = createRequestHandler(storage);

  res.locals.storage = storage;
  res.locals.effects = effects;

  next();
});

const renderApp = (req, res, context): string => ReactDomServer.renderToString(
  <StaticRouter
    basename={req.baseUrl}
    location={req.url}
    context={context}
  >
    <App storage={res.locals.storage} />
  </StaticRouter>
);

app.use((req, res) => {
  // Catch all route, let the app handle 404
  const context = {};

  renderApp(req, res, context);

  if (context.url) {
    res.writeHead(302, { location: context.url });

    return res.end();
  }

  res.locals.effects.waitForAll().then(() => {
    const html = renderApp(req, res, context);

    if (context.url) {
      res.writeHead(302, { location: context.url });

      return res.end();
    }

    const data = JSON.stringify(res.locals.storage.getSnapshot());

    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Crustate Blog Example</title>
    <link rel="preload" href="${req.baseUrl}/dist/client.js" as="script" />
  </head>
  <body>
    <div id="app">${html}</div>
    <script>
      window.appdata        = ${data};
      window.routerBasename = ${JSON.stringify(req.baseUrl)};
    </script>
    <script src="${req.baseUrl}/dist/client.js" defer></script>
  </body>
</html>`);
  });
});

export default app;
