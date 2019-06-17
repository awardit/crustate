/* @flow */

import React from "react";
import classnames from "classnames";

type TodoTextInputProps = {
  editing?: boolean,
  newTodo?: boolean,
  onSave: (text: string) => mixed,
  placeholder?: string,
  text?: string,
};

export const TodoTextInput = ({ editing, newTodo, onSave, placeholder, text: defaultText }: TodoTextInputProps) => {
  const [text, setText] = React.useState(defaultText || "");

  const handleBlur    = e => newTodo && onSave(e.target.value);
  const handleChange  = e => setText(e.target.value);
  const handleKeyDown = e => {
    const text = e.target.value.trim();

    if(e.which === 13) {
      onSave(text);

      if(newTodo) {
        setText("");
      }
    }
  };

  return (
    <input
      autoFocus
      type="text"
      className={classnames({ edit: editing, "new-todo": newTodo })}
      placeholder={placeholder}
      value={text}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
};