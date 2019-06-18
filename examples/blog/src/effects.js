/* @flow */

import type { Post, PostHeading } from "./state";

export const LIST_RESPONSE: "effects/response/list" = "effects/response/list";
export const POST_RESPONSE: "effects/response/post" = "effects/response/post";

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