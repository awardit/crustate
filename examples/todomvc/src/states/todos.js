/* @flow */

import { createStateData } from "crustate/react";
import { NONE
       , updateData } from "crustate";

export type Todo = {
  id:        number,
  text:      string,
  completed: boolean,
};

const ADD          = "todosAdd";
const EDIT         = "todosEdit";
const REMOVE       = "todosRemove";
const CLEAR_ALL    = "todosClearAll";
const COMPLETE     = "todosComplete";
const COMPLETE_ALL = "todosCompleteAll";

type TodoMsg =
  | { tag: typeof ADD, text: string }
  | { tag: typeof EDIT, id: number, text: string }
  | { tag: typeof REMOVE, id: number }
  | { tag: typeof CLEAR_ALL }
  | { tag: typeof COMPLETE, id: number }
  | { tag: typeof COMPLETE_ALL };

export const add         = (text: string)             => ({ tag: ADD, text });
export const edit        = (id: number, text: string) => ({ tag: EDIT, id, text });
export const remove      = (id: number)               => ({ tag: REMOVE, id });
export const clearAll    = ()                         => ({ tag: CLEAR_ALL });
export const complete    = (id: number)               => ({ tag: COMPLETE, id });
export const completeAll = ()                         => ({ tag: COMPLETE_ALL });

const maxId = (todos: Array<Todo>) => todos.reduce((a, t) => Math.max(a, t.id), 1);

export const TodosState = createStateData<Array<Todo>, {}, TodoMsg>({
  name:   "todos",
  init:   () => updateData([]),
  update: (todos, msg) => {
    switch(msg.tag) {
    case ADD:
      return updateData([...todos, { id: maxId(todos) + 1, text: msg.text, completed: false }]);
    case EDIT:
      return updateData(todos.map(t => t.id === msg.id ? { id: t.id, text: msg.text, completed: t.completed } : t));
    case REMOVE:
      return updateData(todos.filter(t => t.id !== msg.id));
    case COMPLETE:
      return updateData(todos.map(t => t.id === msg.id ? { id: t.id, text: t.text, completed: !t.completed } : t));
    case COMPLETE_ALL:
      const allMarked = todos.every(t => t.completed);

      return updateData(todos.map(t => ({ id: t.id, text: t.text, completed: !allMarked })));
    case CLEAR_ALL:
      return updateData(todos.map(t => ({ id: t.id, text: t.text, completed: false })));
    }

    return NONE;
  },
  subscriptions: () => ({
    [ADD]: true,
    [EDIT]: true,
    [REMOVE]: true,
    [CLEAR_ALL]: true,
    [COMPLETE]: true,
    [COMPLETE_ALL]: true,
  }),
});
