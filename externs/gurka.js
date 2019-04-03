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
 */
gurka.StateDefinition.prototype.init = function(initialData) {};
/**
 * @public
 */
gurka.StateDefinition.prototype.receive = function(state, message) {};
/**
 * @public
 */
gurka.StateDefinition.prototype.subscriptions = function(state) {};

gurka.NONE = 0;
gurka.update = function(data) {};
/**
 * @param {...!gurka.Message} message
 */
gurka.updateAndSend = function(data, message) {};
/**
 * @param {!string} name
 * @param {!gurka.StateDefinition} def
 */
gurka.defineState = function(name, def) {};
gurka.createState = function(instance, state, params) {};
gurka.stateData = function(instance) {};
/**
 * @return {string}
 */
gurka.stateName = function(instance) {};

gurka.NONE = 0;

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
gurka.Storage.prototype.getNested;
gurka.Storage.prototype.addListener = function(eventName, callback) {};
gurka.Storage.prototype.removeListener = function(eventName, callback) {};
gurka.Storage.prototype.removeAllListeners;
gurka.Storage.prototype.listeners;
gurka.Storage.prototype.emit;

/**
 * @constructor
 * @extends {gurka.EventEmitter}
 */
gurka.StateInstance = function() {};
gurka.StateInstance.prototype.getNested;
gurka.StateInstance.prototype.sendMessage;

gurka.createState;
gurka.defineState;
gurka.stateName;
gurka.stateData;
gurka.subscribe;
gurka.update;
gurka.updateAndSend;
