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
crustate.StateDefinition = function() {}
/**
 * @public
 * @type {!string}
 */
crustate.StateDefinition.prototype.name;
/**
 * @public
 */
crustate.StateDefinition.prototype.init = function(initialData) {};
/**
 * @public
 */
crustate.StateDefinition.prototype.update = function(state, message) {};
/**
 * @public
 */
crustate.StateDefinition.prototype.subscribe = function(state) {};

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
crustate.Storage.prototype.registerState;
crustate.Storage.prototype.ensureState;
crustate.Storage.prototype.sendMessage;
  /**
   * @export
   */
crustate.Storage.prototype.addSubscriber = function(listener, subscription) {};
crustate.Storage.prototype.getNested;
crustate.Storage.prototype.getNestedOrCreate = function(state, params) {};
crustate.Storage.prototype.getPath;
crustate.Storage.prototype.getStorage;
crustate.Storage.prototype.removeNested;
crustate.Storage.prototype.removeSubscriber;
crustate.Storage.prototype.stateDefinition;

/**
 * @constructor
 * @extends {crustate.EventEmitter}
 */
crustate.StateInstance = function() {};
crustate.StateInstance.prototype.getData;
crustate.StateInstance.prototype.getName;
crustate.StateInstance.prototype.getNested;
crustate.StateInstance.prototype.getNestedOrCreate = function(state, params) {};
crustate.StateInstance.prototype.getPath;
crustate.StateInstance.prototype.getStorage;
crustate.StateInstance.prototype.removeNested;
crustate.StateInstance.prototype.sendMessage;
