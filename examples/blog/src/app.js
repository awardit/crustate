/* @flow */

import type { Storage } from "crustate";

import { StorageProvider } from "crustate/react";
import * as React from "react";
import { Route } from "react-router";
import { PostData, PostListData } from "./state";
import { ListPostsView } from "./views/list";
import { PostView } from "./views/post";

type Props = {
  storage: Storage,
};

type RouteParams = {
  match: {
    params: { [key: string]: string },
  },
};

export const App = ({ storage }: Props): React.Node => (
  <StorageProvider storage={storage}>
    <Route
      path="/"
      render={() => (
        <PostListData.Provider>
          <ListPostsView />
        </PostListData.Provider>
      )}
    />
    <Route
      exact
      path="/post/:id"
      render={({ match: { params: { id } } }: RouteParams) => (
        <PostData.Provider name={`post_${id}`} postId={Number.parseInt(id, 10)}>
          <PostView />
        </PostData.Provider>
      )}
    />
  </StorageProvider>
);
