/* @flow */

import type { ListResponse
            , PostResponse } from "./effects";

import { updateAndSend
       , updateData } from "crustate";
import { createStateData } from "crustate/react";
import { requestList
       , requestPost
       , LIST_RESPONSE
       , POST_RESPONSE } from "./effects";

export type PostHeading = {
  id: number,
  title: string
};

export type Post = {
  id: number,
  title: string,
  date: Date,
  author: string,
  body: string,
};

export type PostListDataState = Array<PostHeading> | string | null;

export const PostListData = createStateData<PostListDataState, {}, ListResponse>({
  name: "list",
  init: () => updateAndSend(null, requestList()),
  update: (state, msg) => msg.data ? updateData(msg.data) : updateData(msg.error),
  subscribe: state => state ? {} : { [LIST_RESPONSE]: true },
});

export type PostDataState =
  | {| state: "LOADING", postId: number |}
  | {| state: "LOADED", post: Post |}
  | {| state: "ERROR", error: string |};

export const PostData = createStateData<PostDataState, { postId: number }, PostResponse>({
  name: "post",
  init: ({ postId }) => updateAndSend({ state: "LOADING", postId }, requestPost(postId)),
  update: (state, msg) => msg.data ? updateData({ state: "LOADED", post: msg.data }) : updateData({ state: "ERROR", error: msg.error }),
  subscribe: state => state.state === "LOADING" ? {
    [POST_RESPONSE]: {
      filter: resp => Boolean(resp.error || (resp.data && resp.data.id === state.postId)),
    },
  } : {},
});