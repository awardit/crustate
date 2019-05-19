/* @flow */
import { updateAndSend
       , updateData
       , NONE
       , subscribe } from "crustate";
import { createStateData } from "crustate/react";
import { requestList
       , LIST_RESPONSE
} from "./effects";

import type { ListResponse
            , PostHeading } from "./effects";

export const PostList = createStateData<Array<PostHeading> | string | null, {}, ListResponse>({
  name: "list",
  init: () => updateAndSend(null, requestList()),
  update: (state, msg) => msg.data ? updateData(msg.data) : updateData(msg.error),
  subscriptions: state => state ? [] : [subscribe(LIST_RESPONSE)],
});