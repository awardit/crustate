/**
 * @fileoverview Externs for Crustate
 * @externs
 */

/**
 * @suppress {duplicate, const}
 */
var crustate = {};

/**
 * @public
 * @interface
 */
crustate.Message = function() {}

/**
 * @type {String}
 */
crustate.Message.prototype.tag;

/**
 * Public interface type
 *
 * @public
 * @interface
 */
crustate.Model = function() {}
/**
 * @public
 * @type {!string}
 */
crustate.Model.prototype.name;
/**
 * @public
 */
crustate.Model.prototype.init = function(initialData) {};
/**
 * @public
 */
crustate.Model.prototype.update = function(state, message) {};
/**
 * @public
 */
crustate.Model.prototype.subscribe = function(state) {};

crustate.NONE = 0;
crustate.updateData = function(data) {};
/**
 * @param {...!crustate.Message} message
 */
crustate.updateAndSend = function(data, message) {};

crustate.subscribe;

/**
 * @constructor
 */
crustate.EventEmitter = function() {};
crustate.EventEmitter.prototype.addListener = function(eventName, callback) {};
crustate.EventEmitter.prototype.removeListener = function(eventName, callback) {};
/**
 * @param {?string} eventName
 */
crustate.EventEmitter.prototype.removeAllListeners = function(eventName) {};
crustate.EventEmitter.prototype.listeners = function() {};
crustate.EventEmitter.prototype.emit = function() {};

/**
 * @constructor
 * @extends {crustate.EventEmitter}
 */
crustate.Storage = function () {};
crustate.Storage.prototype.registerModel;
crustate.Storage.prototype.tryRegisterModel;
crustate.Storage.prototype.sendMessage;
  /**
   * @export
   */
crustate.Storage.prototype.addSubscriber = function(listener, subscription) {};
crustate.Storage.prototype.getState;
crustate.Storage.prototype.createState = function(state, params) {};
crustate.Storage.prototype.getPath;
crustate.Storage.prototype.getStorage;
crustate.Storage.prototype.removeState;
crustate.Storage.prototype.removeSubscriber;
crustate.Storage.prototype.stateDefinition;

/**
 * @constructor
 * @extends {crustate.EventEmitter}
 */
crustate.State = function() {};
crustate.State.prototype.getData;
crustate.State.prototype.getName;
crustate.State.prototype.getState;
crustate.State.prototype.createState = function(state, params) {};
crustate.State.prototype.getPath;
crustate.State.prototype.getStorage;
crustate.State.prototype.removeState;
crustate.State.prototype.sendMessage;
