/* @flow */

import React from "react";
import { useSendMessage, useData } from "crustate/react";
import { TodosState, add, completeAll } from "./states/todos";
import { Footer } from "./footer";
import { TodoTextInput } from "./todo-text-input";
import { TodoList } from "./todo-list";

export const Header = () => {
  const sendMessage = useSendMessage();

  return (
    <header className="header">
      <h1>todos</h1>
      <TodoTextInput
        isNewTodo
        placeholder="What needs to be done?"
        onSave={text => text.length !== 0 && sendMessage(add(text))}
      />
    </header>
  );
};

export const MainSection = () => {
  const todos = useData(TodosState);
  const sendMessage = useSendMessage();
  const completedCount = todos.reduce((a, t) => a + (t.completed ? 1 : 0), 0);

  return (
    <section className="main">
      {todos.length > 0 ?
        <span>
          <input
            readOnly
            className="toggle-all"
            type="checkbox"
            checked={completedCount === todos.length} />
          <label onClick={() => sendMessage(completeAll())} />
        </span> :
        null}
      <TodoList />
      {todos.length > 0 ?
        <Footer
          completedCount={completedCount}
          activeCount={todos.length - completedCount}
        /> :
        null}
    </section>
  );
};

export const App = () => (
  <section className="todoapp">
    <Header />
    <MainSection />
  </section>
);
