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
            , Storage
            , Supervisor } from "crustate";

import { createContext
       , createElement
       , useContext
       , Component } from "react";

type StateProviderState<T, I, M> = {
  instance: StateInstance<T, I, M>,
  data:     T,
};

type DataProviderProps<T> = T & { children?: ?React$Node };

// FIXME: Redefine this so it throws when undefined
export type DataFunction<T> = (data: T | void) => ?React$Node;

/**
 * DataProvider is a component which will load or instantiate a state-instance
 * with the given props as its initial data, and supply the state-data to its
 * children.
 */
export type DataProvider<T, I> = React$ComponentType<DataProviderProps<I>>;
/**
 * DataConsumer is a component which takes a function as children and will call
 * this function with the state instance data.
 */
export type DataConsumer<T> = React$ComponentType<{ children: DataFunction<T>}>;

/**
 * TestProvider is a component which exposes a property for setting the
 * state-data value used in children, useful for testing components by
 * supplying the state-data without having to instantiate a state.
 */
export type TestProvider<T> = React$ComponentType<{ value: T, children?: ?React$Node }>;

/**
 * React-wrapper for a crustate-state.
 */
export type StateData<T, I, M> = {
  /**
   * Internal: Reference to the data-context.
   */
  _dataContext: React$Context<T | void>,
  /**
   * The state-definition, exposed to be loaded for hydration and for testing.
   *
   * TODO: Rename to something better
   */
  state: State<T, I, M>,
  /**
   * A context provider allowing the state-data to be set to a constant value,
   * useful for testing.
   */
  TestProvider: TestProvider<T>,
  Provider: DataProvider<T, I>,
  Consumer: DataConsumer<T>,
};

/**
 * The basic state context where we will carry either a Storage, or a state
 * instance for the current nesting.
 *
 * @suppress {checkTypes}
 */
export const StateContext: Context<?Supervisor> = createContext(null);

type StorageProviderProps = { storage: Storage, children?: ?React$Node };

// TODO: better handling of this, should probably have more stuff?
/**
 * Provider for the Storage-instance to be used in all child-components.
 *
 * @suppress {checkTypes}
 */
export function StorageProvider({ storage, children }: StorageProviderProps) {
  return createElement(StateContext.Provider, { value: storage }, children);
}

const InstanceProvider = StateContext.Provider;

/**
 * Returns a function for passing messages into the state-tree at the current
 * nesting.
 *
 * @suppress {checkTypes}
 */
export function useSendMessage(): (message: Message, sourceName?: string) => void {
  const supervisor = useContext(StateContext);

  if( ! supervisor) {
    throw new Error(`useSendMessage() must be used inside a <State.Provider />.`);
  }

  return (message: Message, sourceName?: string) =>
    supervisor.sendMessage(message, sourceName);
}

/**
 * @suppress {checkTypes}
 * @return {!StateData}
 */
export function createStateData<T, I: {}, M>(state: State<T, I, M>): StateData<T, I, M> {
  const DataContext  = (createContext(undefined): React$Context<T | void>);
  const DataProvider = DataContext.Provider;

  /**
   * @constructor
   * @extends {React.Component}
   */
  class StateProvider extends Component<DataProviderProps<I>, StateProviderState<T, I, M>> {
    static contextType  = StateContext;
    static displayName  = state.name + `.Provider`;

    onNewData: (data: T) => void;
    context:   ?Supervisor;
    state:     StateProviderState<T, I, M>;

    constructor(props: DataProviderProps<I>, context: ?Supervisor) {
      super(props, context);

      if( ! context) {
        throw new Error(`<${state.name}.Provider /> must be used inside a <StorageProvider />`);
      }

      // Exclude children when using getNestedOrCreate, they are always new
      // objects and are most likely not of interest to the state.
      const { children: _, ...remainingProps } = props;

      const instance = context.getNestedOrCreate(state, remainingProps);
      const data     = instance.getData();

      // We use setState to prevent issues with re-rendering
      this.onNewData = (data: T) => this.setState({ data });

      this.state = {
        instance,
        data,
      };
    }

    addListener() {
      this.state.instance.addListener("stateNewData", this.onNewData);

      // Data can be new since we are runnning componentDidMount() after render()
      const newData = this.state.instance.getData();

      if(this.state.data !== newData) {
        // Force re-render immediately
        this.onNewData(newData);
      }
    }

    removeListener() {
      this.state.instance.removeListener("stateNewData", this.onNewData);

      // Drop the state instance if we were the last listener
      if(this.state.instance.listeners("stateNewData").length === 0 && this.context) {
        this.context.removeNested(state);
      }
    }

    componentWillReceiveProps(props: DataProviderProps<I>, context: ?Supervisor) {
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
export function useData<T, I, M>(context: StateData<T, I, M>): T {
  const { _dataContext, state } = context;
  const data = useContext(_dataContext);

  if(data === undefined) {
    throw new Error(`useData(${state.name}) must be used inside a <${state.name}.Provider />`);
  }

  return data;
}