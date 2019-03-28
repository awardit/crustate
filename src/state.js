/* @flow */

import type { Update
            , DataUpdate
            , MessageUpdate } from "./update";
import type { Message
            , MessageFilter
            , MessageTag } from "./message";
import { updateStateDataNoNone
       , updateOutgoingMessages } from "./update";

export { NONE
       , update
       , updateAndSend } from "./update";

/**
 * A filter identifying messages a State can respond to.
 */
export opaque type Subscription = {
  /**
   * The message tag to subscribe to.
   */
  // TODO: Can we (or should we) merge this with the `matcher`?
  tag:     MessageTag,
  /**
   * If the Subscription is passive it will not consume the message and it will
   * also not count towards the message being handled.
   *
   * Suitable for things which are to observe the state-changes for of other
   * states.
   */
  passive: boolean,
  /**
   * Extra, user-supplied, filtering logic.
   */
  matcher: MessageFilter | null,
};

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
  stateName:     string,
  init:          Init<T, I>,
  receive:       Receive<T>,
  subscriptions: Subscriptions<T>,
};

type StateInstanceMap = { [stateName:string]: StateInstance<any, any> };

type InflightMessage = {
  message:  Message,
  source:   Array<string>,
  /**
   * If an active subscription has received this message.
   */
  received: boolean,
  // TODO: Add extra data about source state path and so on so we can respond and track
};

/**
 * Creates a new type of State, can then be used with Root to create instances
 * of the state.
 *
 * @param {!string} name
 * @param {!StateDefinition}
 */
export function createState<T, I>(name: string, definition: StateDefinition<T, I>): State<T, I> {
  return {
    stateName:     name,
    init:          definition.init,
    receive:       definition.receive,
    subscriptions: definition.subscriptions,
  };
}

// TODO: External message observers, kinda like event listeners in that they
//       provide a list of subscriptions
export class Root {
  nested: StateInstanceMap;
  /**
   * State-definitions, used for subscribers and messages.
   */
  defs:   { [key:string]: State<any, any> };
  /**
   * List of messages to propagate.
   */
  inbox:  Array<InflightMessage>;
  dirty:  boolean;

  constructor() {
    this.nested = {};
    this.defs   = {};
    this.dirty  = false;
  }

  registerStateType<T, I>(state: State<T, I>) {
    if( ! this.registerState(state)) {
      // FIXME: Proper exception type
      throw new Error(`Duplicate state name ${state.stateName}`);
    }
  }

  /**
   * Loads the given state-definition for use, ensures that it is not a new
   * state with the same name if it is already loaded. `true` returned if it
   * was new, `false` otherwise.
   */
  registerState<T, I>(state: State<T, I>): boolean {
    const { stateName } = state;

    if( ! this.defs[stateName]) {
      this.defs[stateName] = state;

      return true;
    }

    if(this.defs[stateName] !== state) {
      // FIXME: Proper exception type
      throw new Error(`State object mismatch for state ${stateName}`);
    }

    return false;
  }

  setDirty(path: Array<string>) {
    this.dirty = true;
  }
}

export type Supervisor = StateInstance<any, any> | Root;

export opaque type StateInstance<T, I> = {
  stateRoot:  Root,
  stateName:  string,
  stateData:  T,
  supervisor: Supervisor,
  params:     I,
  nested:     StateInstanceMap,
  /**
   * List of messages to match against subscriptions and then propagate.
   */
  inbox:      Array<InflightMessage>,
};

function statePath(state: Supervisor): Array<string> {
  const path = [];

  while( ! (state instanceof Root)) {
    path.push(state.stateName);

    state = state.supervisor;
  }

  return path;
}

function queueMessages(supervisor: Supervisor, source: Array<string>, messages: Array<Message>): void {
  const stateRoot  = supervisor instanceof Root ? supervisor : supervisor.stateRoot;

  stateRoot.setDirty(source);

  supervisor.inbox = supervisor.inbox.concat(messages.map(message => ({
    message,
    source,
    received: false,
  })));
}

export function sendMessage(supervisor: Supervisor, message: Message): void {
  queueMessages(supervisor, statePath(supervisor), [message]);
}

export function newStateInstance<T, I>(supervisor: Supervisor, state: State<T, I>, initialData: I): StateInstance<T, I> {
  const { nested } = supervisor;
  const stateRoot  = supervisor instanceof Root ? supervisor : supervisor.stateRoot;

  stateRoot.registerState(state);

  const { stateName, init } = state;

  const update    = init(initialData);
  const stateData = updateStateDataNoNone(update);
  const messages  = updateOutgoingMessages(update);
  const instance  = {
    stateRoot,
    stateName,
    stateData,
    supervisor,
    params: initialData,
    nested: {},
    inbox:  [],
  };
  const path = statePath(instance);

  nested[stateName] = instance;

  // TODO: Should the root really be dirty for this? Technically yes? But with React?
  stateRoot.setDirty(path);

  if(messages.length > 0) {
    queueMessages(supervisor, path, messages);
  }

  return instance;
}

export function getState<T, I>(supervisor: Supervisor, state: State<T, I>): ?StateInstance<T, I> {
  const { nested } = supervisor;
  const root: Root = supervisor instanceof Root ? supervisor : supervisor.stateRoot;

  root.registerState(state);

  return nested[state.stateName];
}