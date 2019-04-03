/* @flow */
/*
 * We need to suppress Google Closure Compiler's checkTypes warnings throughout
 * the file since @ampproject/rollup-plugin-closure-compiler generates bad
 * externs for named external imports. Everything becomes function() {}, which
 * causes argument-mismatch warnings preventing compilation.
 */

import type { Context } from "react";
import type { Message
            , State
            , StateInstance
            , Supervisor } from "gurka";

import React from "react";
import { stateData
       , createState
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
 * The basic state context where we will carry either a Storage, or a state
 * instance for the current nesting.
 */
export const StateContext: Context<?Supervisor> = createContext(null);

// TODO: better handling of this, should probably have more stuff?
export const StorageProvider = StateContext.Provider;

const InstanceProvider = StateContext.Provider;

/**
 * Returns a function for passing messages into the state-tree at the current
 * nesting.
 *
 * @suppress {checkTypes}
 */
export function useSendMessage(): (message: Message) => void {
  const supervisor = useContext(StateContext);

  if( ! supervisor) {
    throw new Error(`useSendMessage() must be used inside of a <State.Provider />.`);
  }

  return (message: Message) => supervisor.sendMessage(message);
}

/**
 * @suppress {checkTypes}
 * @return {!ReactState}
 */
export function createReactState<T, I: {}>(state: State<T, I>): ReactState<T, I> {
  const displayName  = stateName(state) + " State.Provider";
  const DataContext  = (createContext(undefined): React$Context<T | void>);
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

      if( ! context) {
        throw new Error(`<${displayName} /> must be used inside a <StorageProvider />`);
      }

      const instance = context.getNested(state) || createState(context, state, this.props);
      const data     = stateData(instance);

      // We use setState to prevent issues with re-rendering
      this.onNewData = (data: T) => this.setState({ data });

      this.state = {
        instance,
        data,
      };
    }

    addListener() {
      // TODO: Fix types for event listeners
      this.state.instance.addListener("stateNewData", (this.onNewData: any));

      // Data can be new since we are runnning componentDidMount() after render()
      const newData = stateData(this.state.instance);

      if(this.state.data !== newData) {
        // Force re-render immediately
        this.onNewData(newData);
      }
    }

    removeListener() {
      // TODO: Do we remove the state from the supervisor here?
      this.state.instance.removeListener("stateNewData", (this.onNewData: any));
    }

    componentWillReceiveProps(props: I & { children: ?React$Node }) {
      const context = this.context;
      if( ! context) {
        throw new Error(`<${displayName} /> must be used inside a <StorageProvider />`);
      }

      // Check if we got a new context instance
      // TODO: Send message if we have new props to the instance, move this into core
      const instance = context.getNested(state) || createState(context, state, props);

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