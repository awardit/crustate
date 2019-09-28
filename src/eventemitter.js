/* @flow */

export type Listener<Events, Name: $Keys<Events>> = (...args: $ElementType<Events, Name>) => mixed;
export type Listeners<Events> = { [eventName: string]: ?Array<Listener<Events, *>> };

export class EventEmitter<Events: {}> {
  _eventListeners: Listeners<Events> = {};

  addListener<K: $Keys<Events>>(eventName: K, listener: Listener<Events, K>): void {
    const existing = this._eventListeners[(eventName: string)];

    if(existing) {
      existing.push(listener);
    }
    else {
      this._eventListeners[(eventName: string)] = [listener];
    }
  }

  removeListener<K: $Keys<Events>>(eventName: K, listener: Listener<Events, K>): void {
    const existing: ?Array<Listener<Events, K>> = this._eventListeners[(eventName: string)];

    if(existing) {
      const i = existing.indexOf(listener);

      if(i >= 0) {
        if(existing.length > 1) {
          existing.splice(i, 1);
        }
        else {
          delete this._eventListeners[(eventName: string)];
        }
      }
    }
  }

  removeAllListeners(eventName?: string): void {
    if(eventName) {
      delete this._eventListeners[(eventName: string)];
    }
    else {
      this._eventListeners = {};
    }
  }

  listeners<K: $Keys<Events>>(eventName: K): Array<Listener<Events, K>> {
    return this._eventListeners[(eventName: string)] || [];
  }

  emit<K: $Keys<Events>>(eventName: K, ...args: $ElementType<Events, K>): void {
    const handler = this._eventListeners[(eventName: string)];

    if(handler) {
      for(const i of handler) {
        i(...args);
      }
    }
  }
}
