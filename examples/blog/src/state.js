/* @flow */

import type { ListResponse
            , PostHeading } from "./effects";

import { updateAndSend
       , updateData
       , NONE }            from "crustate";
import { createStateData } from "crustate/react";
import { requestList
       , LIST_RESPONSE }   from "./effects";

export const PostList = createStateData<Array<PostHeading> | string | null, {}, ListResponse>({
  name:      "list",
  init:      () => updateAndSend(null, requestList()),
  update:    (state, msg) => msg.data ? updateData(msg.data) : updateData(msg.error),
  subscribe: state => state ? {} : { [LIST_RESPONSE]: true },
});