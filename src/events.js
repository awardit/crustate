/* @flow */

// TODO: Fix this type
export type Listener  = (...args: Array<mixed>) => mixed;
export type Listeners = { [eventName:string]: Listener | Array<Listener> };

// TODO: Event types? as in string + parameters

// TODO: Convenience API with returning a function which will remove the callback?
export class EventEmitter<Events: {}> {
  // TODO: Maybe follow the example of EventEmitter and make the whole property optional?
  eventListeners: Listeners = {};

  addListener(eventName: string, listener: Listener): void {
    const existing = this.eventListeners[eventName];

    if( ! existing) {
      this.eventListeners[eventName] = listener;
    }
    else {
      if(typeof existing === "function") {
        this.eventListeners[eventName] = [existing, listener];
      }
      else {
        existing.push(listener);
      }
    }
  };

  removeListener(eventName: string, listener: Listener): void {
    const existing = this.eventListeners[eventName];

    if(existing === listener) {
      delete this.eventListeners[eventName];
    }
    else if(existing && typeof existing !== "function") {
      const i = existing.indexOf(listener);

      if(i >= 0) {
        existing.splice(i, 1);

        if(existing.length === 1) {
          this.eventListeners[eventName] = existing[0];
        }
      }
    }
  };

  removeAllListeners(eventName?: string) {
    if( ! eventName) {
      this.eventListeners = {};
    }
    else {
      delete this.eventListeners[eventName];
    }
  };

  listeners(eventName: string): Array<Listener> {
    const existing = this.eventListeners[eventName];

    return ! existing ? [] : typeof existing === "function" ? [existing] : existing;
  };

  /**
   * @param {!string} eventName
   */
  emit(eventName: string, ...args: Array<mixed>): void {
    const handler = this.eventListeners[eventName];

    if(typeof handler === "function") {
      handler.apply(null, args);
    }
    else if(handler) {
      for(let i = 0; i < handler.length; i++) {
        handler[i].apply(null, args);
      }
    }
  };
}