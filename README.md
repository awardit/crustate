![Crustate](https://gist.githubusercontent.com/Poggen/1070c7fd85addacdd928ddcadd095270/raw/63d803896d36e3e2dd3081ccd8ce1d8a94c75038/crustate.svg?sanitize=true "Crustate")
<p align="center">A message-based modular state-management library for JavaScript applications</p>


[![npm bundle size](https://img.shields.io/bundlephobia/minzip/crustate.svg)](https://bundlephobia.com/result?p=crustate)
[![Dependencies](https://img.shields.io/david/m4rw3r/crustate.svg)](https://www.npmjs.com/package/crustate)
[![Build Status](https://travis-ci.org/m4rw3r/crustate.svg?branch=master)](https://travis-ci.org/m4rw3r/crustate)
[![Codecov](https://img.shields.io/codecov/c/gh/m4rw3r/crustate.svg)](https://codecov.io/gh/m4rw3r/crustate)
![License](https://img.shields.io/npm/l/crustate.svg)
[![npm](https://img.shields.io/npm/v/crustate.svg)](https://www.npmjs.com/package/crustate)

This library is based on the principles of message passing found in languages
like Elm and Elixir/Erlang. The purpose is to be able to build modular state
with controlled side-effects through messaging.

## State

```javascript
type State<T, I, M: Message> = {
  name: string,
  init: (init: I) => DataUpdate<T> | MessageUpdate<T>,
  update: (state: T, msg: M) => Update<T>,
  subscriptions: (state: T) => Array<Subscription>,
};
```

States use messages to communicate with other state-instances and the runtime.

### Message

```javascript
type Message = { tag: string };
```

A message is just plain data, a JavaScript object, with two mandatory properties
named `tag`. The `tag` is supposed to work as a discriminator, informing the
receivers of what type of message it is, what possible data it contains, and
what it means.

Note that these messages are to be completely serializable by `JSON.stringify`
to facilitate resumable sever-rendering, logging, history playback, inspection,
and other features.

```javascript
const ADD = "add";

let msg = {
  tag:   ADD,
  value: 2,
};
```

### Update

```javascript
type StateUpdate = <T, M: Message>(state: T, msg: M) => Update<T>;
```

Conceptually `update` is responsible for receiving messages, interpreting
them, updating the state, and send new messages in case other components need
to be informed or additional data requested.

This is very similar to Redux's Reducer concept with the main difference
being that the `update`-function can send new messages.

```javascript
import { NONE, updateData } from "crustate";

function update(state, message) {
  switch(message.tag) {
  case ADD:
    return updateData(state + message.value);
  }

  return NONE;
}
```

Messages sent from the update function are propagated upwards in the
state-hierarchy and can be subscribed to in supervising states.

### Subscriber

For a state to actually receive messages it first needs to subscribe to
messages; which tags it is interested in, if they have any specific
requirements, and if it is supposed to be the primary handler for messages
of that type.
