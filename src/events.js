/* @flow */

export type Listener  = () => mixed;
export type Listeners = { [eventName:string]: Listener | Array<Listener> };

export type EventEmitter = {
  // TODO: Maybe follow the example of EventEmitter and make the whole property optional?
  listeners: Listeners,
};

// TODO: Event types?

// TODO: Convenience API with returning a function which will remove the callback?

export function addListener(emitter: EventEmitter, eventName: string, listener: Listener): void {
  const existing = emitter.listeners[eventName];

  if( ! existing) {
    emitter.listeners[eventName] = listener;
  }
  else {
    if(typeof existing === "function") {
      emitter.listeners[eventName] = [existing, listener];
    }
    else {
      existing.push(listener);
    }
  }
}

export function removeListener(emitter: EventEmitter, eventName: string, listener: Listener): void {
  const existing = emitter.listeners[eventName];

  if(existing === listener) {
    delete emitter.listeners[eventName];
  }
  else if(typeof existing !== "function") {
    const i = existing.indexOf(listener);

    if(i >= 0) {
      existing.splice(i, 1);
    }

    if(existing.length === 1) {
      emitter.listeners[eventName] = existing[0];
    }
  }
}

export function removeAllListeners(emitter: EventEmitter, eventName?: string) {
  if( ! eventName) {
    emitter.listeners = {};
  }
  else {
    delete emitter.listeners[eventName];
  }
}

export function listeners(emitter: EventEmitter, eventName: string): Array<Listener> {
  const existing = emitter.listeners[eventName];

  return ! existing ? [] : typeof existing === "function" ? [existing] : existing;
}

/**
 * @type {function(Object, string, ...*)}
 */
export function emit(emitter: EventEmitter, eventName: string, ...args: Array<mixed>): void {
  const handler = emitter.listeners[eventName];

  if(typeof handler === "function") {
    handler.apply(null, args);
  }
  else if(handler) {
    for(let i = 0; i < handler.length; i++) {
      handler[i].apply(null, args);
    }
  }
}