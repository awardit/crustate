/**
 * @fileoverview Externs for Gurka
 * @externs
 */

/**
 * @suppress {duplicate, const}
 */
var gurka = {};

/**
 * @public
 * @interface
 */
gurka.Message = function() {}

/**
 * @type {String}
 */
gurka.Message.prototype.tag;

/**
 * Public interface type
 *
 * @public
 * @interface
 */
gurka.StateDefinition = function() {}
/**
 * @public
 * @type {!string}
 */
gurka.StateDefinition.prototype.name;
/**
 * @public
 */
gurka.StateDefinition.prototype.init = function(initialData) {};
/**
 * @public
 */
gurka.StateDefinition.prototype.update = function(state, message) {};
/**
 * @public
 */
gurka.StateDefinition.prototype.subscriptions = function(state) {};

gurka.NONE = 0;
gurka.updateData = function(data) {};
/**
 * @param {...!gurka.Message} message
 */
gurka.updateAndSend = function(data, message) {};

gurka.subscribe;

/**
 * @constructor
 */
gurka.EventEmitter = function() {};
gurka.EventEmitter.prototype.addListener = function(eventName, callback) {};
gurka.EventEmitter.prototype.removeListener = function(eventName, callback) {};
/**
 * @param {?string} eventName
 */
gurka.EventEmitter.prototype.removeAllListeners = function(eventName) {};
gurka.EventEmitter.prototype.listeners = function() {};
gurka.EventEmitter.prototype.emit = function() {};

/**
 * @constructor
 * @extends {gurka.EventEmitter}
 */
gurka.Storage = function () {};
gurka.Storage.prototype.registerState;
gurka.Storage.prototype.ensureState;
gurka.Storage.prototype.sendMessage;
  /**
   * @export
   */
gurka.Storage.prototype.addSubscriber;
gurka.Storage.prototype.removeSubscriber;
gurka.Storage.prototype.stateDefinition;
gurka.Storage.prototype.getNested;
gurka.Storage.prototype.getNestedOrCreate = function(state, params) {};
gurka.Storage.prototype.getStorage;
gurka.Storage.prototype.getPath;

/**
 * @constructor
 * @extends {gurka.EventEmitter}
 */
gurka.StateInstance = function() {};
gurka.StateInstance.prototype.getName;
gurka.StateInstance.prototype.getData;
gurka.StateInstance.prototype.getPath;
gurka.StateInstance.prototype.getNested;
gurka.StateInstance.prototype.getNestedOrCreate = function(state, params) {};
gurka.StateInstance.prototype.getStorage;
gurka.StateInstance.prototype.sendMessage;
