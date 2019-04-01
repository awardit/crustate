/* @flow */

import type { Context } from "react";
import type { Message
            , State
            , Supervisor } from "gurka";

import React from "react";
import { addListener
       , createState
       , getNestedInstance
       , removeListener
       , sendMessage
       , stateData } from "gurka";

// @ampproject/rollup-plugin-closure-compiler generates bad externs for named external imports
const { createContext
      , useContext
      , Component } = React;

/**
 * The basic state context where we will carry either a Root, or a state instance.
 */
export const StateContext: Context<?Supervisor> = createContext(null);

// TODO: better handling of this, should probably have more stuff?
export const RootProvider = StateContext.Provider;

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

export function createReactState<T, I>(state: State<T, I>) {
  const displayName  = `${state.name} State.Provider`;
  const DataContext  = createContext(undefined);
  const DataProvider = DataContext.Provider;

  /**
   * @constructor
   * @extends {React.Component}
   */
  class StateProvider extends Component<I, ?Supervisor> {
    static contextType = StateContext;
    static displayName = displayName;

    constructor(props: I, context: ?Supervisor) {
      super(props, context);

      if( ! this.context) {
        throw new Error(`<${displayName} /> must be used inside a <StateRoot />`);
      }

      const instance = getNestedInstance(this.context, state) || createState(this.context, state, this.props);
      const data     = stateData(instance);

      // We use setState to prevent issues with re-rendering
      this.onStateNewData = data => this.setState({ data: data });

      this.state = {
        instance,
        data,
      };
    }

    addListener() {
      addListener(this.state.instance, "stateNewData", this.onStateNewData);

      // Data can be new since we are runnning componentDidMount() after render()
      const newData = stateData(this.state.instance);

      if(this.state.data !== newData) {
        // Force re-render immediately
        this.onStateNewData(newData);
      }
    }

    removeListener() {
      removeListener(this.state.instance, "stateNewData", this.onStateNewData);
    }

    componentWillReceiveProps(props) {
      // Check if we got a new context instance
      // TODO: Send message if we have new props to the instance
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

    if(process.env.NODE_ENV !== "production" && data === undefined) {
      throw new Error(`${state.name}.useData() must be used inside a <${state.name} State.Provider} />`);
    }

    return data;
  };

  return {
    Provider: StateProvider,
    Consumer: DataContext.Consumer,
    useData,
  };
}