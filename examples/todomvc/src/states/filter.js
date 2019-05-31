/* @flow */

import type { Todo } from "./todos";

import { createStateData } from "crustate/react";
import { NONE
       , updateData } from "crustate";

const SET: "filterSet" = "filterSet";

export const SHOW_ACTIVE    = "ACTIVE";
export const SHOW_ALL       = "ALL";
export const SHOW_COMPLETED = "COMPLETED";

export type Filter =
  | typeof SHOW_ALL
  | typeof SHOW_ACTIVE
  | typeof SHOW_COMPLETED;

type FilterMsg = { tag: typeof SET, value: Filter };

export const todoFilterPredicate = (filter: Filter) => (todo: Todo) => {
  if(filter === SHOW_ACTIVE) {
    return !todo.completed;
  }
  else if(filter === SHOW_COMPLETED) {
    return todo.completed;
  }

  return true;
};

export const setFilter = (value: Filter) => ({ tag: SET, value});

export const FilterState = createStateData<Filter, {}, FilterMsg>({
  name:      "filter",
  init:      ()       => updateData(SHOW_ALL),
  update:    (_, msg) => updateData(msg.value),
  subscribe: ()       => ({ [SET]: true })
});