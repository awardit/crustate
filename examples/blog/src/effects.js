/* @flow */
import type { StatePath
            , Storage } from "crustate";

import { subscribe } from "crustate";

export const LIST_RESPONSE: "effects/response/list" = "effects/response/list";
export const POST_RESPONSE: "effects/response/post" = "effects/response/post";

export type PostHeading = {
  title: string
};

export type Post = {
  title:  string,
  date:   Date,
  author: string,
  body:   string,
};

export type DataRequest =
  | {| tag: "effects/request", resource: "list" |}
  | {| tag: "effects/request", resource: "post", id: number |};

export type Response<T, D> = {| tag: T, data: D |} | {| tag: T, error: string |};

export type ListResponse = Response<"effects/response/list", Array<PostHeading>>;
export type PostResponse = Response<"effects/response/post", Post>;

export const requestList = (): DataRequest =>
  ({ tag: "effects/request", resource: "list" });
export const requestPost = (id: number): DataRequest =>
  ({ tag: "effects/request", resource: "post", id });

export function createRequestHandler(storage: Storage) {
  const subscriber = (msg: DataRequest, source: StatePath) => {
    switch(msg.resource) {
    case "list":
      // TODO: Generalize this:
      fetch("/posts").then(
        // TODO: How can we type this to ensure we reply with the correct message type?
        data => storage.replyMessage({ tag: "effects/response/list", data }, source),
        error => storage.replyMessage({ tag: "effects/response/list", error }, source))
      break;
    case "post":
      fetch(`/posts/${msg.id}`).then(
        data => storage.replyMessage({ tag: "effects/response/post", data }, source),
        error => storage.replyMessage({ tag: "effects/response/post", error }, source))
      break;
    }
  };

  // TODO: How to properly type this? Can we come up with a solution which
  //       also works for the problem with State.subscribers?
  storage.addSubscriber((subscriber: any), [subscribe("effects/request")]);
}