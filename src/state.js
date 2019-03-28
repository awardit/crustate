/* @flow */

import type { Update
            , DataUpdate
            , MessageUpdate } from "./update";
import type { InflightMessage
            , Message
            , MessageFilter
            , MessageTag } from "./message";
import type { Subscription } from "./message";
import { updateStateDataNoNone
       , updateOutgoingMessages } from "./update";
import { enqueue } from "./message";

export type StatePath = Array<string>;

/**
 * Initialization function, called when the initial data is loaded into the state.
 */
export type Init<T, I> = (init: I) => DataUpdate<T> | MessageUpdate<T>;
/**
 * Receive function, receives messages for a state and produces a state-update
 * which can include messages sent to supervisors.
 */
export type Receive<T> = (state: T, msg: Message) => Update<T>;
/**
 * A list of subscriptions
 */
export type Subscriptions<T> = (state: T) => Array<Subscription>;

export type StateDefinition<T, I> = {
  init:          Init<T, I>,
  receive:       Receive<T>,
  subscriptions: Subscriptions<T>,
};

/**
 * Definition of a state containing the data `T` which can be instantiated given
 * the initial data `I`.
 */
export opaque type State<T, I> = {
  name:          string,
  init:          Init<T, I>,
  receive:       Receive<T>,
  subscriptions: Subscriptions<T>,
};

type StateInstanceMap = { [name:string]: StateInstance<any, any> };

/**
 * Creates a new type of State, can then be used with Root to create instances
 * of the state.
 *
 * @param {!string} name
 * @param {!StateDefinition} definition
 */
export function defineState<T, I>(name: string, definition: StateDefinition<T, I>): State<T, I> {
  return {
    name:          name,
    init:          definition.init,
    receive:       definition.receive,
    subscriptions: definition.subscriptions,
  };
}

// TODO: External message observers, kinda like event listeners in that they
//       provide a list of subscriptions
export type Root = {|
  nested: StateInstanceMap;
  /**
   * State-definitions, used for subscribers and messages.
   */
  defs:   { [key:string]: State<any, any> };
  /**
   * List of messages to propagate.
   */
  inbox:  Array<InflightMessage>;
  dirty:  Array<StatePath>;
|};

export function createRoot(): Root {
  return {
    nested: {},
    defs:   {},
    inbox:  [],
    dirty:  [],
  };
}

export function registerState<T, I>(root: Root, state: State<T, I>) {
  if( ! ensureState(root, state)) {
    // FIXME: Proper exception type
    throw new Error(`Duplicate state name ${state.name}`);
  }
}

/**
  * Loads the given state-definition for use, ensures that it is not a new
  * state with the same name if it is already loaded. `true` returned if it
  * was new, `false` otherwise.
  */
export function ensureState<T, I>(root: Root, state: State<T, I>): boolean {
  const { name } = state;

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

export function setDirty(root: Root, path: StatePath) {
  root.dirty.push(path);

  // TODO: Notify observers
}

export opaque type StateInstance<T, I> = {|
  root:       Root,
  name:       string,
  data:       T,
  supervisor: Supervisor,
  params:     I,
  nested:     StateInstanceMap,
  /**
   * List of messages to match against subscriptions and then propagate.
   */
  inbox:      Array<InflightMessage>,
|};

export type Supervisor = StateInstance<any, any> | Root;

export function statePath(state: Supervisor): StatePath {
  const path = [];

  while(state.root) {
    path.push(state.name);

    state = state.supervisor;
  }

  return path;
}

export function getRoot(supervisor: Supervisor): Root {
  return supervisor.root ? supervisor.root : supervisor;
}

export function sendMessage(supervisor: Supervisor, message: Message): void {
  const path = statePath(supervisor);

  setDirty(getRoot(supervisor), path);

  enqueue(supervisor, path, [message]);
}

export function newState<T, I>(supervisor: Supervisor, state: State<T, I>, initialData: I): StateInstance<T, I> {
  const { nested } = supervisor;
  const root       = getRoot(supervisor);

  ensureState(root, state);

  const { name, init } = state;

  const update   = init(initialData);
  const data     = updateStateDataNoNone(update);
  const messages = updateOutgoingMessages(update);
  const instance = {
    root,
    name,
    data,
    supervisor,
    params: initialData,
    nested: {},
    inbox:  [],
  };
  const path = statePath(instance);

  nested[name] = instance;

  // TODO: Should the root really be dirty for this? Technically yes? But with React?
  setDirty(root, path);

  if(messages.length > 0) {
    enqueue(supervisor, path, messages);
  }

  return instance;
}

export function getState<T, I>(supervisor: Supervisor, state: State<T, I>): ?StateInstance<T, I> {
  const { nested } = supervisor;
  const root       = getRoot(supervisor);

  ensureState(root, state);

  return nested[state.name];
}