/**
 * @fileoverview Externs for Gurka
 * @externs
 */

/**
 * @public
 * @interface
 */
function Message() {}

/**
 * @type {String}
 */
Message.prototype.tag;

/**
 * Public interface type
 *
 * @public
 * @interface
 */
function StateDefinition() {}

/**
 * @public
 */
StateDefinition.prototype.init = function(initialData) {};
/**
 * @public
 */
StateDefinition.prototype.receive = function(state, message) {};
/**
 * @public
 */
StateDefinition.prototype.subscriptions = function(state) {};

/**
 * @suppress {duplicate, const}
 */
var gurka = {};

gurka.NONE = 0;
gurka.update = function(data) {};
/**
 * @param {...!Message} message
 */
gurka.updateAndSend = function(data, message) {};
/**
 * @param {!string} name
 * @param {!StateDefinition} def
 */
gurka.defineState = function(name, def) {};
gurka.createState = function(instance, state, params) {};
gurka.stateData = function(instance) {};
/**
 * @param {!Message} message
 */
gurka.sendMessage = function(instance, message) {};
gurka.getNestedInstance = function(instance, state) {};
gurka.createRoot = function() {};
gurka.addListener = function(instance, eventName, callback) {};
gurka.removeListener = function(instance, eventName, callback) {};
