/* @flow */

import type { Todo } from "./states/todos";

import React from "react";
import classnames from "classnames";
import { useSendMessage, useData } from "crustate/react";
import { FilterState, todoFilterPredicate } from "./states/filter";
import { TodosState, edit, remove, complete } from "./states/todos";
import { TodoTextInput } from "./todoTextInput";

export const TodoList = () => {
  const todos = useData(TodosState);
  const filter = useData(FilterState);

  return (
    <ul className="todo-list">
      {todos.filter(todoFilterPredicate(filter)).map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
        />
      ))}
    </ul>
  );
};

type TodoItemProps = {
  todo: Todo,
};

export const TodoItem = ({ todo: { id, text, completed } }: TodoItemProps) => {
  const [editing, setEditing] = React.useState(false);
  const sendMessage = useSendMessage();
  const handleDoubleClick = () => setEditing(true);
  const handleSave = text => {
    if(text.length === 0) {
      sendMessage(remove(id));
    }
    else {
      sendMessage(edit(id, text));
    }

    setEditing(false);
  };

  return (
    <li className={classnames({ completed, editing })}>
      {editing ? (
        <TodoTextInput
          editing
          text={text}
          onSave={handleSave}
        />
      ) : (
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={completed}
            onChange={() => sendMessage(complete(id))}
          />
          <label onDoubleClick={handleDoubleClick}>
            {text}
          </label>
          <button
            className="destroy"
            type="button"
            onClick={() => sendMessage(remove(id))}
          />
        </div>
      )}
    </li>
  );
};