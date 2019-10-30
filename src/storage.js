/* @flow */

import type { Effect, EffectErrorMessage } from "./effect";
import type { Model, TypeofModelData, TypeofModelInit } from "./model";
import type { InflightMessage, Message } from "./message";

import { debugAssert } from "./assert";
import { EFFECT_ERROR } from "./effect";
import { EventEmitter } from "./eventemitter";
import { findMatchingSubscription } from "./message";

export type StatePath = $ReadOnlyArray<string>;

/**
 * A snapshot of the state of the application, can be used to restore the state
 * provided the requisite state-definitions have been loaded.
 */
export type Snapshot = { [instanceName: string]: StateSnapshot };
export type StateSnapshot = {
  /**
   * Name to use to find the model when loading the snapshot
   */
  id: string,
  data: mixed,
  nested: Snapshot,
};

export type StateMap = { [name: string]: State<any> };

export type StorageEvents = {
  /**
   * Emitted when a message did not find any active subscriber.
   *
   * Parameters:
   *
   *  * Message
   *  * Path to the origin state
   */
  unhandledMessage: [Message, StatePath],
  /**
   * Emitted when a state is created.
   *
   * Parameters:
   *
   *  * Path to the new state
   *  * Initial data supplied to the state
   *  * State data
   */
  stateCreated: [StatePath, mixed, mixed],
  /**
   * Emitted when a state is removed.
   *
   * Parameters:
   *
   * * Path to removed state
   * * State data
   */
  stateRemoved: [StatePath, mixed],
  /**
   * Emitted when a state-instance updates its data.
   *
   * Parameters:
   *
   *  * The new data
   *  * Path to the new state
   *  * Message which caused the update
   */
  stateNewData: [mixed, StatePath, Message],
  /**
   * Emitted when a message is queued for processing.
   *
   * Parameters:
   *
   *  * The message
   *  * Path of the origin, the closest state + the event source name
   */
  messageQueued: [Message, StatePath],
  /**
   * Emitted when a message is queued for processing.
   *
   * Parameters:
   *
   *  * The message
   *  * Path of the matching state-instance
   *  * If the subscription was passive
   */
  messageMatched: [Message, StatePath, boolean],
  /**
   * Emitted when a snapshot is going to be restored.
   *
   * Parameters:
   *
   *  * The snapshot to be restored.
   */
  snapshotRestore: [Snapshot],
  /**
   * Emitted after a snapshot has been restored.
   */
  snapshotRestored: [],
};

export type StateEvents<M: AnyModel> = {
  /**
   * Emitted when a state-instance updates its data.
   *
   * Parameters:
   *
   *  * The new data
   *  * Path to the new state
   *  * Message which caused the update
   */
  stateNewData: [TypeofModelData<M>, StatePath, Message],
};

export type RunningEffect = {
  +name: ?string,
  +message: Message,
  +source: StatePath,
};

type AnyModel = Model<any, any, any>;

const ANONYMOUS_SOURCE = "$";
const BROADCAST_SOURCE = "@";
const REPLY_SOURCE = "<";

class Supervisor<+E: {}> extends EventEmitter<E> {
  _nested: StateMap = {};

  // Abstract methods
  +_getStorage: () => Storage;
  +getPath: () => StatePath;

  // Explicit constructor results in shorter minified code
  constructor(): void {
    super();
  }

  /**
   * Returns the nested State for the given model and name if it
   * exists, name defaults to model id.
   */
  getState<M: AnyModel>(m: M, name?: string): ?State<M> {
    if (process.env.NODE_ENV !== "production") {
      ensureModel(this._getStorage(), m);
    }

    const inst = this._nested[name || m.id];

    if (inst) {
      debugAssert(inst._name === (name || m.id),
        `State name '${inst._name}' does not match key name '${name || m.id}`);
    }

    return inst;
  }

  /**
   * Attempts to retrieve the nested State for the given model and name,
   * if it does not exist it will be created, name defaults to model id.
   */
  createState<M: AnyModel>(m: M, params: TypeofModelInit<M>, name?: string): State<M> {
    const { id, init } = m;

    if (!name) {
      name = id;
    }

    if (this._nested[name]) {
      // TODO: Maybe add path?
      throw new Error(`Duplicate state '${name}'`);
    }

    const storage = this._getStorage();

    tryAddModel(storage, m);

    const { data, messages } = init(params);

    debugAssert(
      this instanceof Storage || this instanceof State,
      "this is not an instance of Storage or State"
    );

    const instance = new State(id, (this: any), data, name);
    const path = instance.getPath();

    this._nested[name] = instance;

    storage.emit("stateCreated", path, (params: any), data);

    if (messages) {
      instance._init = processInstanceMessages(
        storage,
        instance._supervisor,
        messages.map((m: Message): InflightMessage => createInflightMessage(storage, path, m))
      );
    }

    return instance;
  }

  removeState<M: AnyModel>(m: M, name?: string): void {
    const inst = this.getState(m, name);

    if (inst) {
      delete this._nested[name || inst._name];

      this._getStorage().emit("stateRemoved", inst.getPath(), inst._data);
    }
  }

  /**
   * Sends the given message to any matching State or Subscriber in the
   * state-tree.
   */
  sendMessage(msg: Message, srcName?: string = ANONYMOUS_SOURCE): Promise<void> {
    const storage = this._getStorage();
    const msgPath = this.getPath().concat([srcName]);

    return processInstanceMessages(storage, this, [createInflightMessage(storage, msgPath, msg)]);
  }
}

/**
 * Base node in a state-tree, anchors all states and carries all data.
 */
export class Storage extends Supervisor<StorageEvents> {
  +_effects: Array<Effect<any>> = [];
  +_running: Map<Promise<any>, RunningEffect> = new Map();
  /**
   * Models, used for subscribers, updates and messages.
   */
  +_defs: { [id: string]: Model<any, any, any> } = {};
  _waiting: Array<() => void> = [];

  // Explicit constructor results in shorter minified code
  constructor(): void {
    super();
  }

  /**
   * Returns the Storage backing all state in this tree.
   */
  _getStorage(): Storage {
    return this;
  }

  /**
   * Returns the path to this state.
   */
  getPath(): StatePath {
    return [];
  }

  /**
   * Adds the supplied model to the Storage so it can be used when
   * using restoreSnapshot(). Throws if a model with the same id already exist.
   */
  addModel<T, I, M>(model: Model<T, I, M>): void {
    if (!tryAddModel(this, model)) {
      throw new Error(`Duplicate model '${model.id}'.`);
    }
  }

  /**
   * Returns the model with the given id, if it exists.
   */
  getModel<T, I, M>(id: string): ?Model<T, I, M> {
    return this._defs[id];
  }

  /**
   * Sends a message to all state-instances currently reachable from this
   * Storage instance.
   */
  broadcastMessage(msg: Message, sourceName?: string = BROADCAST_SOURCE): Promise<void> {
    return processEffects(
      this,
      handleBroadcast(
        this,
        [],
        this._nested,
        createInflightMessage(this, [sourceName], msg)
      )
    );
  }

  /**
   * Looks up the closest matching State for the given path, then sends the
   * supplied message to all matching States and Subscribers.
   */
  // TODO: Remove once Effects is in place?
  replyMessage(
    msg: Message,
    targetState: StatePath,
    sourceName?: string = REPLY_SOURCE
  ): Promise<void> {
    const instance = findClosestSupervisor(this, targetState);
    const inflight = [createInflightMessage(this, targetState.concat(sourceName), msg)];

    return processInstanceMessages(this, instance, inflight);
  }

  addEffect(eff: Effect<any>): void {
    this._effects.push(eff);
  }

  removeEffect(eff: Effect<any>): void {
    const i = this._effects.indexOf(eff);

    if (i !== -1) {
      this._effects.splice(i, 1);
    }
  }

  /**
   * Creates a snapshot of the current state-tree. State-data will not be
   * copied.
   */
  getSnapshot(): Snapshot {
    return createSnapshot(this);
  }

  /**
   * Attempts to restore a snapshot. Will throw if required models are missing.
   */
  restoreSnapshot(snapshot: Snapshot): void {
    this.emit("snapshotRestore", snapshot);

    restoreSnapshot(this, this, snapshot);

    this.emit("snapshotRestored");
  }

  wait(): Promise<void> {
    if (this._running.size === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve: () => void): void => {
      this._waiting.push(resolve);
    });
  }

  runningEffects(): Array<RunningEffect> {
    /* eslint-disable-next-line unicorn/prefer-spread */
    return Array.from(this._running.values());
  }
}

/**
 * Object representing an instance of a Model.
 */
export class State<M: AnyModel> extends Supervisor<StateEvents<M>> {
  /**
   * Matches the Storage _defs collection.
   */
  _id: string;
  /**
   * Matches the key used in the supervisor's `_nested` collection.
   */
  _name: string;
  _data: TypeofModelData<M>;
  _supervisor: Storage | State<any>;
  _init: ?Promise<void>;

  constructor(
    id: string,
    supervisor: Storage | State<any>,
    data: TypeofModelData<M>,
    name: string
  ): void {
    super();

    this._id = id;
    this._name = name;
    this._supervisor = supervisor;
    this._data = data;
  }

  /**
   * Returns the data contained in this State.
   */
  getData(): TypeofModelData<M> {
    return this._data;
  }

  /**
   * Returns the path to this state.
   */
  getPath(): StatePath {
    const path = [];
    let s = this;

    while (s instanceof State) {
      path.unshift(s._name);

      s = s._supervisor;
    }

    return path;
  }

  /**
   * Returns a promise resolving when the state has initialized and its effects
   * have settled. If they already have settled it will return a resolved
   * promise.
   */
  waitInit(): Promise<void> {
    if (this._init) {
      return this._init;
    }

    return Promise.resolve(undefined);
  }

  /**
   * Returns the Storage backing all state in this tree.
   */
  _getStorage(): Storage {
    let s = this._supervisor;

    while (s instanceof State) {
      s = s._supervisor;
    }

    return s;
  }
}

export function restoreSnapshot(
  storage: Storage,
  supervisor: Storage | State<any>,
  snapshot: Snapshot
): void {
  const newNested: StateMap = {};

  // We trust that the user has not been poking around in globals
  /* eslint-disable-next-line guard-for-in */
  for (const k in snapshot) {
    const { id, data, nested } = snapshot[k];

    // Ensure the model exists when we restore
    getModelById(storage, id);

    const inst = new State(id, supervisor, data, k);

    restoreSnapshot(storage, inst, nested);

    newNested[k] = inst;
  }

  supervisor._nested = newNested;
}

/**
  * Loads the given model for use, ensures that it is not a new model with the
  * same name if it is already loaded. `true` returned if it was new, `false`
  * otherwise.
  */
export function tryAddModel<T, I, M>(storage: Storage, model: Model<T, I, M>): boolean {
  const { id } = model;

  if (!storage._defs[id]) {
    storage._defs[id] = model;

    return true;
  }

  ensureModel(storage, model);

  return false;
}

export function ensureModel<T, I, M>(storage: Storage, model: Model<T, I, M>): void {
  const { id } = model;

  if (storage._defs[id] && storage._defs[id] !== model) {
    throw new Error(`Model mismatch for '${id}'.`);
  }
}

export function getModelById<T, I, M: Message>(
  storage: Storage,
  id: string
): Model<T, I, M> {
  const spec = storage._defs[id];

  if (!spec) {
    // TODO: Error type
    throw new Error(`Missing model for state '${id}'.`);
  }

  return spec;
}

export function createInflightMessage(
  storage: Storage,
  source: StatePath,
  message: Message
): InflightMessage {
  storage.emit("messageQueued", message, source);

  return {
    _message: message,
    _source: source,
    _received: false,
  };
}

export function findClosestSupervisor(supervisor: Supervisor<{}>, path: StatePath): Supervisor<{}> {
  for (const p of path) {
    if (!supervisor._nested[p]) {
      return supervisor;
    }

    supervisor = supervisor._nested[p];
  }

  return supervisor;
}

export function enqueueMessages(
  storage: Storage,
  source: StatePath,
  inflight: Array<InflightMessage>,
  messages: Array<Message>
): void {
  for (const m of messages) {
    inflight.push(createInflightMessage(storage, source, m));
  }
}

export function processInstanceMessages(
  storage: Storage,
  instance: Supervisor<{}>,
  inflight: Array<InflightMessage>
): Promise<any> {
  let sourcePath = instance.getPath();

  while (instance instanceof State) {
    processMessages(storage, instance, sourcePath, inflight);

    // Traverse down one level
    sourcePath = sourcePath.slice(0, -1);
    instance = instance._supervisor;
  }

  return processEffects(storage, inflight);
}

export function processMessages(
  storage: Storage,
  instance: State<any>,
  sourcePath: StatePath,
  inflight: Array<InflightMessage>
): void {
  const definition = getModelById(storage, instance._id);

  // We are going to add to messages if any new messages are generated, save
  // length here
  const currentLimit = inflight.length;
  const { update, subscribe } = definition;

  // We need to be able to update the filters if the data changes
  let messageFilter = subscribe(instance._data);

  // TODO: Emit event? that we are considering messags for state?

  for (let i = 0; i < currentLimit; i++) {
    const currentInflight = inflight[i];
    const { _message: m } = currentInflight;
    const match = findMatchingSubscription(messageFilter, m, currentInflight._received);

    if (match) {
      if (!match._isPassive) {
        currentInflight._received = true;
      }

      storage.emit("messageMatched", m, sourcePath, match._isPassive);

      const updateRequest = update(instance._data, m);

      if (updateRequest) {
        const { data, messages } = updateRequest;

        instance._data = data;

        storage.emit("stateNewData", data, sourcePath, m);
        instance.emit("stateNewData", data, sourcePath, m);

        if (messages) {
          enqueueMessages(storage, sourcePath, inflight, messages);
        }

        // TODO: Skip on last iteration?
        messageFilter = subscribe(instance._data);
      }
    }

    // No Match
  }
}

export function processEffects(
  storage: Storage,
  inflightMsgs: Array<InflightMessage>
): Promise<void> {
  const effects = [];

  for (const { _message, _source, _received } of inflightMsgs) {
    let received = _received;

    for (const effect of storage._effects) {
      const match = findMatchingSubscription(effect.subscribe, _message, received);

      if (match) {
        if (!match._isPassive) {
          received = true;
        }

        storage.emit("messageMatched", _message, ([]: StatePath), match._isPassive);

        effects.push(runEffect(storage, effect, _message, _source));
      }
    }

    if (!received) {
      storage.emit("unhandledMessage", _message, _source);
    }
  }

  return (Promise.all(effects): any);
}

/**
 * Runs the supplied effect and attempts to collect any reply-message from it,
 * rejections will cause an `EffectErrorMessage` to be sent as a reply.
 *
 * The resulting promise will always succeed.
 */
export function runEffect(
  storage: Storage,
  { effect, name }: Effect<any>,
  message: Message,
  source: StatePath
): Promise<?Promise<void>> {
  const onSuccess = (msg: ?Message): ?Promise<void> => msg ?
    storage.replyMessage(msg, source, name) :
    null;
  const onError = (e: any): Promise<void> => storage.replyMessage(
    ({ tag: EFFECT_ERROR, error: e }: EffectErrorMessage),
    source,
    name
  );

  // TODO: Try-catch around the effect call?
  const promise = Promise.resolve(effect(message, source)).then(onSuccess, onError);
  const dropPromise = (): void => {
    storage._running.delete(promise);

    if (storage._running.size === 0) {
      for (const r of storage._waiting) {
        r();
      }

      storage._waiting = [];
    }
  };

  storage._running.set(promise, {
    name,
    message,
    source,
  });

  return promise.then(dropPromise, dropPromise);
}

/**
 * Broadcasts msg to all state instances with a depth first algo.
 *
 * Mutates msg
 */
export function handleBroadcast(
  storage: Storage,
  path: StatePath,
  nested: StateMap,
  msg: InflightMessage
): Array<InflightMessage> {
  const returning = [msg];

  // We trust that the user has not been poking around in globals
  /* eslint-disable-next-line guard-for-in */
  for (const key in nested) {
    const instance = nested[key];
    const nestedPath = path.concat([key]);
    const messages = handleBroadcast(storage, nestedPath, instance._nested, msg);
    const hasBeenReceived = msg._received;

    msg._received = false;

    // We modify messages
    processMessages(storage, instance, nestedPath, messages);

    // Propagate the received flag
    msg._received = msg._received || hasBeenReceived;

    // We have multiple instances of msg here now, one from each child
    // deduplicate.
    for (const m of messages) {
      if (returning.indexOf(m) === -1) {
        returning.push(m);
      }
    }
  }

  return returning;
}

export function createSnapshot(node: Supervisor<{}>): Snapshot {
  return Object.keys(node._nested).reduce((a: Snapshot, key: string): Snapshot => {
    const nested = node._nested[key];

    a[key] = {
      id: nested._id,
      // We assume it is immutably updated
      data: nested._data,
      nested: createSnapshot(nested),
    };

    return a;
  }, {});
}
