/* @flow */

import React from "react";
import { Link } from "react-router-dom";
import { useData } from "crustate/react";
import { PostData } from "../state";

export const PostView = (): React$Node => {
  const data = useData(PostData);

  switch(data.state) {
  case "LOADING":
    return <p>Loading</p>;
  case "ERROR":
    return (
      <section>
        <h2>Error</h2>
        <p>{data.error}</p>
      </section>
    );
  default:
    const { title, author, body } = data.post;

    return (
      <section>
        <Link to="/">Back</Link>
        <h2>{title}</h2>
        <p>{author}</p>
        <p>{body}</p>
      </section>
    );
  }
};
