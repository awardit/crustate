/* @flow */

/*
 * We need to suppress Google Closure Compiler's checkTypes warnings throughout
 * the file since @ampproject/rollup-plugin-closure-compiler generates bad
 * externs for named external imports. Everything becomes function() {}, which
 * causes argument-mismatch warnings preventing compilation.
 */

import type { Context } from "react";
import type {
  Message,
  Model,
  Storage,
  State,
  TypeofModelData,
  TypeofModelInit,
} from "crustate";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
} from "react";

type DataProviderProps<T> = T & { name?: string, children?: ?React$Node };

type AnyModel = Model<any, any, any>;

// FIXME: Redefine this so it throws when undefined
export type DataFunction<T> = (data: T | void) => ?React$Node;

/**
 * DataProvider is a component which will load or instantiate a state-instance
 * with the given props as its initial data, and supply the state-data to its
 * children.
 */
export type DataProvider<I> = React$ComponentType<DataProviderProps<I>>;

/**
 * DataConsumer is a component which takes a function as children and will call
 * this function with the state data.
 */
export type DataConsumer<T> = React$ComponentType<{ children: DataFunction<T> }>;

/**
 * TestProvider is a component which exposes a property for setting the
 * state-data value used in children, useful for testing components by
 * supplying the state-data without having to create a state.
 */
export type TestProvider<T> = React$ComponentType<{ value: T, children?: ?React$Node }>;

/**
 * React-wrapper for a crustate-state.
 */
export type StateData<M: AnyModel> = {
  /**
   * Internal: Reference to the data-context.
   */
  +_dataContext: React$Context<TypeofModelData<M> | void>,
  /**
   * The model, exposed to be loaded for hydration and for testing.
   */
  +model: M,
  /**
   * A context provider allowing the state-data to be set to a constant value,
   * useful for testing.
   */
  +TestProvider: TestProvider<TypeofModelData<M>>,
  +Provider: DataProvider<TypeofModelInit<M>>,
  +Consumer: DataConsumer<TypeofModelData<M>>,
};

type StorageProviderProps = { storage: Storage, children?: ?React$Node };

/**
 * The basic state context where we will carry either a Storage, or a state
 * for the current nesting.
 *
 * @suppress {checkTypes}
 */
export const StateContext: Context<?State<any> | Storage> = createContext(null);

const InstanceProvider = StateContext.Provider;

/**
 * Provider for the Storage-instance to be used in all child-components.
 *
 * @suppress {checkTypes}
 */
export function StorageProvider({ storage, children }: StorageProviderProps): React$Node {
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

  if (!supervisor) {
    throw new Error("useSendMessage() must be used inside a <State.Provider />.");
  }

  return (message: Message, sourceName?: string): void =>
    supervisor.sendMessage(message, sourceName);
}

/**
 * Exclude children and name properties when using createState, children
 * are always new objects and are most likely not of interest to the state, and
 * name is an external parameter.
 */
function excludeChildren<T: { children?: ?React$Node, name?: string }>(
  props: T
): $Rest<T, {| children: ?React$Node, name: ?string |}> {
  // Manually implemented object-rest-spread to avoid Babel's larger
  // implementation
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
export function createStateData<+M: AnyModel>(model: M): StateData<M> {
  const Ctx = (createContext(undefined): React$Context<ModelDataType<M> | void>);
  const { Provider } = Ctx;

  function DataProvider(props: DataProviderProps<TypeofModelInit<M>>): React$Node {
    const context = useContext(StateContext);

    if (!context) {
      throw new Error(`<${model.id}.Provider /> must be used inside a <StorageProvider />`);
    }

    const instance = context.createState(model, excludeChildren(props), props.name);
    const [data, setData] = useState(instance.getData());

    useEffect((): (() => void) => {
      instance.addListener("stateNewData", setData);

      // Data can be new since we are runnning componentDidMount()
      // after render()
      const newData = instance.getData();

      if (data !== newData) {
        // Force re-render immediately
        setData(newData);
      }

      return (): void => {
        instance.removeListener("stateNewData", setData);

        // Drop the state if we were the last listener
        if (instance.listeners("stateNewData").length === 0) {
          context.removeState(model, instance.getName());
        }
      };
    /* eslint-disable react-hooks/exhaustive-deps */
    // We need to skip the dep on data since otherwise we are going to
    // re-register the state every time
    }, [context, instance]);
    /* eslint-enable react-hooks/exhaustive-deps */

    return createElement(InstanceProvider, { value: instance },
      createElement(Provider, { value: data },
        props.children));
  }

  return {
    _dataContext: Ctx,
    model,
    // We have to cheat here since the value must be possible to use as
    // undefined internally, but when testing it should not be possible to use
    // without a fully defined `T`:
    TestProvider: (Provider: React$ComponentType<{ children: ?React$Node, value: any }>),
    Provider: DataProvider,
    Consumer: Ctx.Consumer,
  };
}

/**
 * Returns the data in the topmost state associated with the supplied
 * StateData. Will throw if a StateData.Provider is not a parent node.
 *
 * @suppress {checkTypes}
 */
export function useData<M: AnyModel>(context: StateData<M>): ModelDataType<M> {
  const { _dataContext, model } = context;
  const data = useContext(_dataContext);

  if (data === undefined) {
    throw new Error(`useData(${model.id}) must be used inside a <${model.id}.Provider />`);
  }

  return data;
}
