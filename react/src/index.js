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
            , Supervisor } from "crustate";

import React from "react";

const { createContext
      , createElement
      , useContext
      , Component } = React;

type StateProviderState<T, I> = {
  instance: StateInstance<T, I>,
  data:     T,
};

type DataProviderProps<T> = T & { children: ?React$Node };

// FIXME: Redefine this so it throws when undefined
export type DataFunction<T> = (data: T | void) => ?React$Node;

/**
 * DataProvider is a component which will load or instantiate a state-instance
 * with the given props as its initial data, and supply the state-data to its
 * children.
 */
export type DataProvider<T, I> = React$ComponentType<DataProviderProps<I>>;
export type DataConsumer<T>    = React$ComponentType<{ children: DataFunction<T>}>;

/**
 * TestProvider is a component which exposes a property for setting the
 * state-data value used in children, useful for testing components by
 * supplying the state-data without having to instantiate a state.
 */
export type TestProvider<T> = React$ComponentType<{ value: T, children: ?React$Node }>;

/**
 * React-wrapper for a crustate-state.
 */
export type StateData<T, I> = {
  /**
   * Internal: Reference to the data-context.
   */
  _dataContext: React$Context<T | void>,
  /**
   * The state-definition, exposed to be loaded for hydration and for testing.
   *
   * TODO: Rename to something better
   */
  state: State<T, I>,
  TestProvider: TestProvider<T>,
  Provider: DataProvider<T, I>,
  Consumer: DataConsumer<T>,
};

/**
 * The basic state context where we will carry either a Storage, or a state
 * instance for the current nesting.
 * @suppress {checkTypes}
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
 * @return {!StateData}
 */
export function createStateData<T, I: {}>(state: State<T, I>): StateData<T, I> {
  const DataContext  = (createContext(undefined): React$Context<T | void>);
  const DataProvider = DataContext.Provider;

  /**
   * @constructor
   * @extends {React.Component}
   */
  class StateProvider extends Component<DataProviderProps<I>, StateProviderState<T, I>> {
    static contextType  = StateContext;
    static displayName  = state.name + `.Provider`;

    onNewData: (data: T) => void;
    context:   ?Supervisor;
    state:     StateProviderState<T, I>;

    constructor(props: DataProviderProps<I>, context: ?Supervisor) {
      super(props, context);

      if( ! context) {
        throw new Error(`<${state.name}.Provider /> must be used inside a <StorageProvider />`);
      }

      const instance = context.getNestedOrCreate(state, this.props);
      const data     = instance.getData();

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
      const newData = this.state.instance.getData();

      if(this.state.data !== newData) {
        // Force re-render immediately
        this.onNewData(newData);
      }
    }

    removeListener() {
      // TODO: Do we remove the state from the supervisor here?
      this.state.instance.removeListener("stateNewData", (this.onNewData: any));
    }

    componentWillReceiveProps(props: DataProviderProps<I>) {
      const context = this.context;
      if( ! context) {
        throw new Error(`<${state.name}.Provider /> must be used inside a <StorageProvider />`);
      }

      // Check if we got a new context instance
      // TODO: Send message if we have new props to the instance, move this into core
      const instance = context.getNestedOrCreate(state, props);

      if(this.state.instance !== instance) {
        this.removeListener();

        this.state = {
          instance,
          data: instance.getData(),
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
      return createElement(InstanceProvider, { value:this.state.instance },
        createElement(DataProvider, { value: this.state.data },
          this.props.children));
    }
  }

  return {
    _dataContext: DataContext,
    state: state,
    // We have to cheat here since the value must be possible to use as
    // undefined internally, but when testing it should not be possible to use
    // without a fully defined `T`:
    TestProvider: (DataContext.Provider: React$ComponentType<{ children: ?React$Node, value: any }>),
    Provider: StateProvider,
    Consumer: DataContext.Consumer,
  };
}

/**
 * Returns the data in the topmost state-instance associated with the supplied
 * state-data. Will throw if a StateData.Provider is not a parent node.
 *
 * @suppress {checkTypes}
 */
export function useData<T, I>(context: StateData<T, I>): T {
  const { _dataContext, state } = context;
  const data = useContext(_dataContext);

  if(data === undefined) {
    throw new Error(`useData(${state.name}) must be used inside a <${state.name}.Provider />`);
  }

  return data;
}