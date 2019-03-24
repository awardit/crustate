
# X is a message-based state management library

This library is based on the principles of message passing found in languages
like Elm and Elixir/Erlang. The purpose is to be able to build modular state
with controlled side-effects through messaging.

## Parts

### Message

A message is just plain data, a JavaScript object, with two mandatory properties
named `kind`. The `kind` is supposed to work as a discriminator, informing the
receivers of what kind of message it is, what possible data it contains, and
what it means.

Note that these messages are to be completely serializable by `JSON.stringify`
to facilitate resumable sever-rendering, logging, history playback, inspection,
and other features.

```javascript
let msg = {
  target: "echoService",
  type:   "ping",
};
```

Messages are passed to the closest matching receiver.

### Receive

Conceptually `receive` is responsible for receiving messages, interpreting
them, updating the state and send new messages in case other components need
to be informed or additional data requested.

This is very similar to Redux's Reducer concept with the main difference
being that the Receive-function can send new messages.

```javascript
function receive(state, message, send) {
  switch(message.kind) {
  case ADD:
    return state + 1;
  }

  return state;
}
```

#### TODO

* Message scoping? We want to be able to see which messages go where, and throw
  if we receive messages we cannot process.
* Let receivers subscribe on events? This still poses the problem of code reuse
  and so on between different states. And also if you nest receivers where you
  have one receiver being the actual receiver with the data-logic, and another
  auxillary receiver which manages some related UI-state then that receiver
  might still have the event subscribed to despite the actual data-receiver
  not accepting the mesasge at that time.
