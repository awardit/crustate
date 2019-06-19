/* @flow */

import type { Todo } from "./todos";

import { createStateData } from "crustate/react";
import { updateData } from "crustate";

export type Filter =
  | typeof SHOW_ALL
  | typeof SHOW_ACTIVE
  | typeof SHOW_COMPLETED;

type FilterMsg = { tag: typeof SET, value: Filter };

const SET: "filterSet" = "filterSet";

export const SHOW_ACTIVE = "ACTIVE";
export const SHOW_ALL = "ALL";
export const SHOW_COMPLETED = "COMPLETED";

export const todoFilterPredicate = (filter: Filter) => (todo: Todo): boolean => {
  if(filter === SHOW_ACTIVE) {
    return ! todo.completed;
  }

  if(filter === SHOW_COMPLETED) {
    return todo.completed;
  }

  return true;
};

export const setFilter = (value: Filter): FilterMsg => ({ tag: SET, value });

export const FilterState = createStateData<Filter, {}, FilterMsg>({
  name: "filter",
  init: () => updateData(SHOW_ALL),
  update: (_, msg) => updateData(msg.value),
  subscribe: () => ({ [SET]: true })
});
