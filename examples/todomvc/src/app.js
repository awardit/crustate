/* @flow */

import React              from "react";
import classnames         from "classnames";
import { useSendMessage } from "crustate/react";

const addTodo = (text: string) => ({ tag: "addTodo", text });

type TodoTextInputProps = {
  editing?:    boolean,
  newTodo?:    boolean,
  onSave:      (text: string) => mixed,
  placeholder: string,
  text?:       string,
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

  return <input
    className={classnames({ "edit": editing, "new-todo": newTodo })}
    type="text"
    placeholder={placeholder}
    autoFocus={true}
    value={text}
    onBlur={handleBlur}
    onChange={handleChange}
    onKeyDown={handleKeyDown}
    />
};

export const Header = () => {
  const sendMessage = useSendMessage();

  return <header className="header">
      <h1>todos</h1>
      <TodoTextInput
        newTodo
        onSave={text => text.length !== 0 && sendMessage(addTodo(text))}
        placeholder="What needs to be done?"
      />
  </header>;
};

export const MainSection = () => {
  return <section className="main">
  </section>;
};

export const App = () => <div>
  <Header />
  <MainSection />
</div>;


