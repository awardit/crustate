/* @flow */

export type Listener<+E, K> = (...args: $ElementType<E, K>) => mixed;
export type Listeners = { [k: string]: Array<(...args: any) => mixed> };

export class EventEmitter<+E: {}> {
  _eventListeners: Listeners = {};

  addListener<K: $Keys<E>>(
    eventName: K,
    // Using inline Listener here since E is not allowed in an input position
    listener: (...args: $ElementType<E, K>) => mixed
  ): void {
    const existing: ?Array<Listener<E, K>> = this._eventListeners[eventName];

    if (existing) {
      existing.push(listener);
    }
    else {
      this._eventListeners[eventName] = [listener];
    }
  }

  removeListener<K: $Keys<E>>(
    eventName: K,
    listener: (...args: $ElementType<E, K>) => mixed
  ): void {
    const existing: ?Array<Listener<E, K>> = this._eventListeners[eventName];

    if (existing) {
      const i = existing.indexOf(listener);

      if (i >= 0) {
        if (existing.length > 1) {
          existing.splice(i, 1);
        }
        else {
          delete this._eventListeners[eventName];
        }
      }
    }
  }

  removeAllListeners(eventName?: string): void {
    if (eventName) {
      delete this._eventListeners[eventName];
    }
    else {
      this._eventListeners = {};
    }
  }

  listeners<K: $Keys<E>>(eventName: K): Array<(...args: $ElementType<E, K>) => mixed> {
    return this._eventListeners[eventName] || [];
  }

  emit<K: $Keys<E>>(eventName: K, ...args: $ElementType<E, K>): void {
    const handler = this._eventListeners[eventName];

    if (handler) {
      for (const i of handler) {
        i(...args);
      }
    }
  }
}
