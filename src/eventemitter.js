/* @flow */

type MaybeArray<T> = T | Array<T>;

export type Listener<Events, Name> = (...args: $ElementType<Events, Name>) => mixed;
export type Listeners = { [eventName: string]: MaybeArray<Listener<{}, any>> };

// TODO: Convenience API with returning a function which will remove the callback?
export class EventEmitter<Events: {}> {
  // TODO: Maybe follow the example of EventEmitter and make the whole property optional?
  _eventListeners: Listeners = {};

  addListener<K: $Keys<Events>>(eventName: K, listener: Listener<Events, K>): void {
    const existing: MaybeArray<Listener<Events, K>> = this._eventListeners[eventName];

    if(existing) {
      if(typeof existing === "function") {
        this._eventListeners[eventName] = [existing, listener];
      }
      else {
        existing.push(listener);
      }
    }
    else {
      this._eventListeners[eventName] = listener;
    }
  }

  removeListener<K: $Keys<Events>>(eventName: K, listener: Listener<Events, K>): void {
    const existing: MaybeArray<Listener<Events, K>> = this._eventListeners[eventName];

    if(existing === listener) {
      delete this._eventListeners[eventName];
    }
    else if(existing && typeof existing !== "function") {
      const i = existing.indexOf(listener);

      if(i >= 0) {
        existing.splice(i, 1);

        if(existing.length === 1) {
          this._eventListeners[eventName] = existing[0];
        }
      }
    }
  }

  removeAllListeners(eventName?: string): void {
    if(eventName) {
      delete this._eventListeners[eventName];
    }
    else {
      this._eventListeners = {};
    }
  }

  listeners<K: $Keys<Events>>(eventName: K): Array<Listener<Events, K>> {
    const existing: MaybeArray<Listener<Events, K>> = this._eventListeners[eventName];

    return existing ? typeof existing === "function" ? [existing] : existing : [];
  }

  emit<K: $Keys<Events>>(eventName: K, ...args: $ElementType<Events, K>): void {
    const handler: MaybeArray<Listener<Events, K>> = this._eventListeners[eventName];

    // Manually used apply since it avoids an iterator shim
    /* eslint-disable prefer-spread */
    if(typeof handler === "function") {
      handler.apply(null, args);
    }
    else if(handler) {
      for(let i = 0; i < handler.length; i++) {
        handler[i].apply(null, args);
      }
    }
    /* eslint-enable prefer-spread */
  }
}