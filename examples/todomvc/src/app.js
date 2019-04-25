/* @flow */

import type { Todo }     from "./states/todos";

import React             from "react";
import classnames        from "classnames";
import { useSendMessage
       , useData }       from "crustate/react";
import { TodosState
       , add
       , completeAll }   from "./states/todos";
import { Footer }        from "./footer";
import { TodoTextInput } from "./todoTextInput";
import { TodoList }      from "./todoList";

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
      <TodoList />
      {todos.length > 0
        ? <Footer completedCount={completedCount}
                  activeCount={todos.length - completedCount} />
        : null}
  </section>;
};


export const App = () => <section className="todoapp">
  <Header />
  <MainSection />
</section>;


