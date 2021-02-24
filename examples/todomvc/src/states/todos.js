/* @flow */

import type { Model } from "crustate";
import type { StateData } from "crustate/react";

import { createStateData } from "crustate/react";
import { updateData } from "crustate";

export type Todo = {
  id: number,
  text: string,
  completed: boolean,
};

type TodoMsg =
  | { tag: typeof ADD, text: string }
  | { tag: typeof EDIT, id: number, text: string }
  | { tag: typeof REMOVE, id: number }
  | { tag: typeof CLEAR_ALL }
  | { tag: typeof COMPLETE, id: number }
  | { tag: typeof COMPLETE_ALL };

export type TodoModel = Model<Array<Todo>, {}, TodoMsg>;

const ADD: "todosAdd" = "todosAdd";
const EDIT: "todosEdit" = "todosEdit";
const REMOVE: "todosRemove" = "todosRemove";
const CLEAR_ALL: "todosClearAll" = "todosClearAll";
const COMPLETE: "todosComplete" = "todosComplete";
const COMPLETE_ALL: "todosCompleteAll" = "todosCompleteAll";

export const add = (text: string): TodoMsg => ({ tag: ADD, text });
export const edit = (id: number, text: string): TodoMsg => ({ tag: EDIT, id, text });
export const remove = (id: number): TodoMsg => ({ tag: REMOVE, id });
export const clearAll = (): TodoMsg => ({ tag: CLEAR_ALL });
export const complete = (id: number): TodoMsg => ({ tag: COMPLETE, id });
export const completeAll = (): TodoMsg => ({ tag: COMPLETE_ALL });

const maxId = (todos: Array<Todo>) => todos.reduce((a, t) => Math.max(a, t.id), 1);

export const TodosState: StateData<TodoModel> = createStateData({
  id: "todos",
  init: () => updateData([]),
  update: (todos, msg) => {
    switch (msg.tag) {
      case ADD:
        return updateData([...todos, { id: maxId(todos) + 1, text: msg.text, completed: false }]);
      case EDIT:
        return updateData(todos.map(t => t.id === msg.id ?
          { id: t.id, text: msg.text, completed: t.completed } :
          t));
      case REMOVE:
        return updateData(todos.filter(t => t.id !== msg.id));
      case COMPLETE:
        return updateData(todos.map(t => t.id === msg.id ?
          { id: t.id, text: t.text, completed: !t.completed } :
          t));
      case COMPLETE_ALL:
        const allMarked = todos.every(t => t.completed);

        return updateData(todos.map(t => ({ id: t.id, text: t.text, completed: !allMarked })));
      case CLEAR_ALL:
        return updateData(todos.map(t => ({ id: t.id, text: t.text, completed: false })));
      default:
      // Nothing
    }
  },
});
