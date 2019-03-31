/* @flow */

import type { State, StatePath } from "./state";
import type { InflightMessage} from "./message";
import type { StateInstance
            , StateInstanceMap } from "./instance";
import type { EventEmitter } from "./events";

import { stateName } from "./state";
import { instanceName } from "./instance";

// TODO: External message observers, kinda like event listeners in that they
//       provide a list of subscriptions
export type Root = {|
  // This spread trick is used to preserve exact object
  ...$Exact<EventEmitter>,
  nested: StateInstanceMap;
  /**
   * State-definitions, used for subscribers and messages.
   */
  defs:   { [key:string]: State<any, any> };
|};

export function createRoot(): Root {
  return {
    nested:    {},
    defs:      {},
    listeners: {},
  };
}

export function registerState<T, I>(root: Root, state: State<T, I>) {
  if( ! ensureState(root, state)) {
    // FIXME: Proper exception type
    throw new Error(`Duplicate state name ${stateName(state)}`);
  }
}

/**
  * Loads the given state-definition for use, ensures that it is not a new
  * state with the same name if it is already loaded. `true` returned if it
  * was new, `false` otherwise.
  */
export function ensureState<T, I>(root: Root, state: State<T, I>): boolean {
  const name = stateName(state);

  if( ! root.defs[name]) {
    root.defs[name] = state;

    return true;
  }

  if(root.defs[name] !== state) {
    // FIXME: Proper exception type
    throw new Error(`State object mismatch for state ${name}`);
  }

  return false;
}

export function stateDefinition<T, I>(root: Root, stateInstance: StateInstance<T, I>): ?State<T, I> {
  return root.defs[instanceName(stateInstance)];
}