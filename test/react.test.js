
import test from "ava";
import React, { Component, createContext } from "react-dom";

test("basic state", t => {
  const App = () => <C.Consumer>{s => s}</C.Consumer>;
})