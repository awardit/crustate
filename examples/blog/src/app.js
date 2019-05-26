/* @flow */

import type { Storage } from "crustate";

import { StorageProvider } from "crustate/react";
import React               from "react";
import { Route }           from "react-router";
import { PostList }        from "./state";
import { ListPosts }       from "./views/list";

type Props = {
  storage: Storage,
};

export default function App({ storage }: Props) {
  return <StorageProvider value={storage}>
    <Route exact path="/" render={() => <PostList.Provider>
      <ListPosts />
    </PostList.Provider>} />
  </StorageProvider>;
}