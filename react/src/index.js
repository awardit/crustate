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
       , useEffect
       , useState } from "react";

type StateProviderState<T, I, M> = {
  instance: StateInstance<T, I, M>,
  data:     T,
};

type DataProviderProps<T> = T & { name?: string, children?: ?React$Node };

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

const InstanceProvider = StateContext.Provider;

type StorageProviderProps = { storage: Storage, children?: ?React$Node };

// TODO: better handling of this, should probably have more stuff?
/**
 * Provider for the Storage-instance to be used in all child-components.
 *
 * @suppress {checkTypes}
 */
export function StorageProvider({ storage, children }: StorageProviderProps) {
  return createElement(InstanceProvider, { value: storage }, children);
}

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
 * Exclude children and name properties when using getNestedOrCreate, children
 * are always new objects and are most likely not of interest to the state, and
 * name is an external parameter.
 */
function excludeChildren<T: { children?: ?React$Node, name?: string }>(props: T): $Rest<T, {| children: ?React$Node, name: ?string |}> {
  // Manually implemented object-rest-spread to avoid Babel's larger implementation
  // Object.assign causes Babel to to add an unnecessary polyfill so use spread
  const rest = { ...props };

  delete rest.children;
  delete rest.name;

  return rest;
}

/**
 * @suppress {checkTypes}
 * @return {!StateData}
 */
export function createStateData<T, I: {}, M>(state: State<T, I, M>): StateData<T, I, M> {
  const Ctx      = (createContext(undefined): React$Context<T | void>);
  const Provider = Ctx.Provider;

  function DataProvider(props: DataProviderProps<I>) {
    const context = useContext(StateContext);

    if( ! context) {
      throw new Error(`<${state.name}.Provider /> must be used inside a <StorageProvider />`);
    }

    const instance        = context.getNestedOrCreate(state, excludeChildren(props), props.name);
    const [data, setData] = useState(instance.getData());

    useEffect(() => {
      instance.addListener("stateNewData", setData);

      // Data can be new since we are runnning componentDidMount() after render()
      const newData = instance.getData();

      if(data !== newData) {
        // Force re-render immediately
        setData(newData);
      }

      return () => {
        instance.removeListener("stateNewData", setData);

        // Drop the state instance if we were the last listener
        if(instance.listeners("stateNewData").length === 0) {
          context.removeNested(state);
        }
      };
    }, [context, instance]);

    return createElement(InstanceProvider, { value: instance },
      createElement(Provider, { value: data },
        props.children));
  }

  return {
    _dataContext: Ctx,
    state: state,
    // We have to cheat here since the value must be possible to use as
    // undefined internally, but when testing it should not be possible to use
    // without a fully defined `T`:
    TestProvider: (Provider: React$ComponentType<{ children: ?React$Node, value: any }>),
    Provider: DataProvider,
    Consumer: Ctx.Consumer,
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