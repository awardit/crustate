/* @flow */

import * as React from "react";
import { Link } from "react-router-dom";
import { useData } from "crustate/react";
import { PostListData } from "../state";

const postItem = ({ id, title }: { id: number, title: string }): React.Node => (
  <article key={id}>
    <h2><Link to={`/post/${id}`}>{title}</Link></h2>
  </article>
);

export const ListPostsView = (): React.Node => {
  const items = useData(PostListData);

  if (!Array.isArray(items)) {
    return (
      <section>
        {items ? <p>Error: {items}</p> : <p>Loading...</p>}
      </section>
    );
  }

  return (
    <section>
      {items.map(i => postItem(i))}
    </section>
  );
};
