/* @flow */

import type { Post } from "../state";

import React        from "react";
import { useData }  from "crustate/react";
import { PostData } from "../state";

export const PostView = () => {
  const data = useData(PostData);

  switch(data.state) {
  case "LOADING":
    return <p>Loading</p>;
  case "ERROR":
    return <section>
      <h2>Error</h2>
      <p>{data.error}</p>
    </section>;
  default:
    const { title, date, author, body } = data.post;

    return <section>
      <h2>{title}</h2>
      <p>{author}</p>
      <p>{body}</p>
    </section>;
  }
}
