/* @flow */

import React        from "react";
import { useData }  from "crustate/react";
import { PostList } from "../state";

const PostItem = ({ id, title }) => <article key={id}>
  <h2>{title}</h2>
</article>;

export const ListPosts = () => {
  const items = useData(PostList);

  if( ! Array.isArray(items)) {
    return <section>
      {items ? <p>Error: {items}</p> : <p>Loading...</p>}
    </section>;
  }

  return <section>
    {items.map(PostItem)}
  </section>;
}