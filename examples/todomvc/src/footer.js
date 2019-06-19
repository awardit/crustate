/* @flow */

import type { Filter } from "./states/filter";

import React from "react";
import classnames from "classnames";
import { clearAll } from "./states/todos";
import { useData, useSendMessage } from "crustate/react";
import {
  SHOW_ALL,
  SHOW_COMPLETED,
  SHOW_ACTIVE,
  FilterState,
  setFilter,
} from "./states/filter";

type LinkProps = {
  children: React$Node,
  selected: boolean,
  onClick: (event: Event) => mixed,
};

type FilterLinkProps = {
  children: React$Node,
  filter: Filter,
};

type FooterProps = {
  activeCount: number,
  completedCount: number,
};

const FILTER_TITLES = {
  [SHOW_ALL]: "All",
  [SHOW_ACTIVE]: "Active",
  [SHOW_COMPLETED]: "Completed",
};

export const Link = ({ children, selected, onClick }: LinkProps) => (
  <a
    className={classnames({ selected })}
    style={{ cursor: "pointer" }}
    onClick={onClick}
  >
    {children}
  </a>
);

export const FilterLink = ({ filter, children }: FilterLinkProps) => {
  const sendMessage = useSendMessage();
  const current = useData(FilterState);

  return (
    <Link
      selected={current === filter}
      onClick={() => sendMessage(setFilter(filter))}
    >
      {children}
    </Link>
  );
};

export const Footer = ({ activeCount, completedCount }: FooterProps) => {
  const itemWord = activeCount === 1 ? "item" : "items";
  const sendMessage = useSendMessage();

  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount || "No"}</strong> {itemWord} left
      </span>
      <ul className="filters">
        {Object.keys(FILTER_TITLES).map(filter => (
          <li key={filter}>
            <FilterLink filter={filter}>{FILTER_TITLES[filter]}</FilterLink>
          </li>
        ))}
      </ul>
      {completedCount > 0 ?
        <button
          type="button"
          className="clear-completed"
          onClick={() => sendMessage(clearAll())}
        >
          Clear completed
        </button> :
        null}
    </footer>
  );
};