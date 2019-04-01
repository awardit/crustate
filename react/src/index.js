/* @flow */

import type { Context } from "react";
import type { Message
            , State
            , StateInstance
            , Supervisor } from "gurka";

import React from "react";
import { addListener
       , createState
       , getNestedInstance
       , removeListener
       , sendMessage
       , stateData
       , stateName } from "gurka";

// @ampproject/rollup-plugin-closure-compiler generates bad externs for named external imports
const { createContext
      , useContext
      , Component } = React;

type StateProviderState<T, I> = {
  instance: StateInstance<T, I>,
  data:     T,
};

  // FIXME: Redefine this so it throws when
export type StateFunction<T> = (data: T | void) => ?React$Node;

export type ReactStateProvider<T, I> = React$ComponentType<I & { children: ?React$Node }>;
export type ReactStateConsumer<T>    = React$ComponentType<{ children: StateFunction<T>}>;

/**
 * Hook returning the data from the state it was created from.
 */
export type UseData<T> = () => T;

/**
 * React-wrapper for a gurka-state.
 */
export type ReactState<T, I> = {
  Provider: ReactStateProvider<T, I>,
  Consumer: ReactStateConsumer<T>,
  useData:  UseData<T>,
};

/**
 * The basic state context where we will carry either a Root, or a state
 * instance for the current nesting.
 */
export const StateContext: Context<?Supervisor> = createContext(null);

// TODO: better handling of this, should probably have more stuff?
export const StateRoot = StateContext.Provider;

const InstanceProvider = StateContext.Provider;

/**
 * Returns a function for passing messages into the state-tree at the current
 * nesting.
 */
export function useSendMessage(): (message: Message) => void {
  const supervisor = useContext(StateContext);

  if( ! supervisor) {
    throw new Error(`useSendMessage() must be used inside of a <State.Provider />.`);
  }

  return (message: Message) => sendMessage(supervisor, message);
}

export function createReactState<T, I: {}>(state: State<T, I>): ReactState<T, I> {
  const displayName  = `${stateName(state)} State.Provider`;
  const DataContext  = createContext<T | void>(undefined);
  const DataProvider = DataContext.Provider;

  /**
   * @constructor
   * @extends {React.Component}
   */
  class StateProvider extends Component<I & { children: ?React$Node }, StateProviderState<T, I>> {
    static contextType = StateContext;
    static displayName = displayName;

    onNewData: (data: T) => void;
    context:   ?Supervisor;
    state:     StateProviderState<T, I>;

    constructor(props: I & { children: ?React$Node }, context: ?Supervisor) {
      super(props, context);

      if( ! this.context) {
        throw new Error(`<${displayName} /> must be used inside a <StateRoot />`);
      }

      const instance = getNestedInstance(this.context, state) || createState(this.context, state, this.props);
      const data     = stateData(instance);

      // We use setState to prevent issues with re-rendering
      this.onNewData = data => this.setState({ data: data });

      this.state = {
        instance,
        data,
      };
    }

    addListener() {
      // TODO: Fix types for event listeners
      addListener(this.state.instance, "stateNewData", (this.onNewData: any));

      // Data can be new since we are runnning componentDidMount() after render()
      const newData = stateData(this.state.instance);

      if(this.state.data !== newData) {
        // Force re-render immediately
        this.onNewData(newData);
      }
    }

    removeListener() {
      // TODO: Do we remove the state from the supervisor here?
      removeListener(this.state.instance, "stateNewData", (this.onNewData: any));
    }

    componentWillReceiveProps(props: I & { children: ?React$Node }) {
      if( ! this.context) {
        throw new Error(`<${displayName} /> must be used inside a <StateRoot />`);
      }

      // Check if we got a new context instance
      // TODO: Send message if we have new props to the instance, move this into core
      const instance = getNestedInstance(this.context, state) || createState(this.context, state, props);

      if(this.state.instance !== instance) {
        this.removeListener();

        this.state = {
          instance,
          data: stateData(instance),
        };

        this.addListener();
      }
    }

    componentDidMount() {
      this.addListener();
    }

    componentWillUnmount() {
      this.removeListener();
    }

    render() {
      return <InstanceProvider value={this.state.instance}>
        <DataProvider value={this.state.data}>
          {this.props.children}
        </DataProvider>
      </InstanceProvider>;
    }
  }

  const useData = () => {
    const data = useContext(DataContext);

    if(data === undefined) {
      throw new Error(`${stateName(state)}.useData() must be used inside a <${displayName} />`);
    }

    return data;
  };

  return {
    Provider: StateProvider,
    Consumer: DataContext.Consumer,
    useData,
  };
}