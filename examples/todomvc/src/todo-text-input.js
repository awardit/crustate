/* @flow */

import React from "react";
import classnames from "classnames";

type TodoTextInputProps = {
  isEditing?: boolean,
  isNewTodo?: boolean,
  onSave: (text: string) => mixed,
  placeholder?: string,
  text?: string,
};

TodoTextInput.defaultProps = {
  isEditing: false,
  isNewTodo: false,
  placeholder: "",
  text: "",
};

export function TodoTextInput({
  isEditing,
  isNewTodo,
  onSave,
  placeholder,
  text: defaultText,
}: TodoTextInputProps) {
  const [text, setText] = React.useState(defaultText || "");

  const handleBlur = e => isNewTodo && onSave(e.target.value);
  const handleChange = e => setText(e.target.value);
  const handleKeyDown = e => {
    const text = e.target.value.trim();

    if (e.which === 13) {
      onSave(text);

      if (isNewTodo) {
        setText("");
      }
    }
  };

  return (
    <input
      autoFocus
      type="text"
      className={classnames({ edit: isEditing, "new-todo": isNewTodo })}
      placeholder={placeholder}
      value={text}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}
