/* @flow */

import React              from "react";
import classnames         from "classnames";
import { useSendMessage
       , useData } from "crustate/react";
import { Footer } from "./footer";
import { FilterState
       , todoFilterPredicate } from "./states/filter";
import { TodosState
       , add
       , edit
       , remove
       , complete
       , completeAll
       , clearAll } from "./states/todos";

type TodoTextInputProps = {
  editing?:     boolean,
  newTodo?:     boolean,
  onSave:       (text: string) => mixed,
  placeholder?: string,
  text?:        string,
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

  return <input className={classnames({ "edit": editing, "new-todo": newTodo })}
                type="text"
                placeholder={placeholder}
                autoFocus={true}
                value={text}
                onBlur={handleBlur}
                onChange={handleChange}
                onKeyDown={handleKeyDown} />
};

export const Header = () => {
  const sendMessage = useSendMessage();

  return <header className="header">
      <h1>todos</h1>
      <TodoTextInput newTodo
                     onSave={text => text.length !== 0 && sendMessage(add(text))}
                     placeholder="What needs to be done?" />
  </header>;
};

export const MainSection = () => {
  const todos          = useData(TodosState);
  const sendMessage    = useSendMessage();
  const completedCount = todos.reduce((a, t) => a + (t.completed ? 1 : 0), 0);

  return <section className="main">
    {todos.length > 0
      ? <span>
          <input className="toggle-all"
                 type="checkbox"
                 checked={completedCount === todos.length}
                 readOnly />
          <label onClick={() => sendMessage(completeAll())} />
        </span>
      : null}
      <VisibleTodoList />
      {todos.length > 0
        ? <Footer completedCount={completedCount}
                  activeCount={todos.length - completedCount} />
        : null}
  </section>;
};

export const TodoItem = ({ todo: { id, text, completed } }) => {
  const [editing, setEditing] = React.useState(false);
  const sendMessage           = useSendMessage();
  const handleDoubleClick     = () => setEditing(true);
  const handleSave            = text => {
    if(text.length === 0) {
      sendMessage(remove(id));
    }
    else {
      sendMessage(edit(id, text));
    }

    setEditing(false);
  };

  return <li className={classnames({ completed, editing })}>
    {editing
      ? <TodoTextInput text={text}
                       editing={true}
                       onSave={handleSave} />
      : <div className="view">
          <input className="toggle"
                 type="checkbox"
                 checked={completed}
                 onChange={() => sendMessage(complete(id))} />
          <label onDoubleClick={handleDoubleClick}>
            {text}
          </label>
          <button className="destroy"
                  onClick={() => sendMessage(remove(id))} />
        </div>}
    </li>;
};

export const VisibleTodoList = () => {
  const todos  = useData(TodosState);
  const filter = useData(FilterState);

  return <ul className="todo-list">
    {todos.filter(todoFilterPredicate(filter)).map(todo =>
      <TodoItem key={todo.id}
                todo={todo} />
    )}
  </ul>
};

export const App = () => <div>
  <Header />
  <MainSection />
</div>;


