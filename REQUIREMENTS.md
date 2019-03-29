 * State must be isolated and nestable
 * States must be able to supervise other states in a tree to provide reliable, reusable, and modular behavour
 * Single-source-of-truth state-storage for easy serialization and hydration on client as well as reproducability
 * Support for developer tools where the developer can see messages and states and subscriptions
 * Messages are plain javascript objects, no functions
 * In the react-adapter, use `useContext` to build the update hierarchy
 * Services for side-effects should be possible to hook in to the central state-manager
 * Messages must be tracked in such a way that services listening to them can feed messages back to the state which crewated them
 * Support for a basic `useState`? Could be problematic
 * Reivers must be pure
 * Subscribe for messages
   Passive and active subscribers? Where we can say that we are not the primary responder to the message?
   Only let one active subscriber respond to each message?
   Function to subscribe
 * Possibility to subscribe to messages on the root state
 * Possibility to observe all state-changes, messages, attached states from the root level
 * Possibility to subscribe to state-differences on the root-level
 * Possibility to subscribe to state-differences on the state-level?



### Receiver

```javascript
type Receiver  = <State>(s: State, m: Msg) => Update<State>

type None      = 0;
type Data      = [S] | [S, Array<Msg>];
type Update<S> = None | Data<S>;
```

### Subscriber

State-dependent to facilitate state-machines

Subscription = 

<State>(s: State) => Array<Subscription>
