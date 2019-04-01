/**
 * @fileoverview Public externs to prevent name-mangling for specific input properties
 *
 * @externs
 */

// Internal API

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
 * @type {!Object}
 */
var exports;

// Punblic API for CommonJS
//
// NOTE: Keep in sync with index.js export

exports.NONE;
exports.addListener;
exports.addSubscriber;
exports.createRoot;
exports.createState;
exports.defineState;
exports.emit;
exports.getNestedInstance;
exports.registerState;
exports.removeAllListeners;
exports.removeListener;
exports.removeSubscriber;
exports.removeState;
exports.sendMessage;
exports.subscribe;
exports.update;
exports.updateAndSend;