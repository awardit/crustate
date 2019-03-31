/* @flow */

import type { Context } from "react";
import type { Supervisor
            , Message } from "gurka";

import { createContext
       , useContext } from "react";
import { sendMessage } from "gurka";

/**
 * The basic state context where we will carry either a Root, or a state instance.
 */
export const StateContext: Context<?Supervisor> = createContext(null);

/**
 * Returns a function for passing messages into the state-tree at the current
 * nesting.
 */
export function useSendMessage(): (message: Message) => void {
  const supervisor = useContext(StateContext);

  if( ! supervisor) {
    throw new Error(`useSendMessage() must be used inside of a <StateProvider />.`);
  }

  return (message: Message) => sendMessage(supervisor, message);
}