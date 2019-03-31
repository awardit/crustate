/**
 * @fileoverview
 *
 * @externs
 */
/**
 * Required since otheriwse Google Closure compiler will freak in env=CUSTOM.
 * It is still not part of the emitted code
 *
 * @type {!Object}
 */
var window;

/**
 * @type {!Object}
 */
var process;

/**
 * @type {!Object}
 */
process.env;
/**
 * @type {!String}
 */
process.env.NODE_ENV;

var console;

/**
 * @param {...*} params
 */
console.log = function(params) {}

function require(module) {}

// React dependency

/**
* @suppress {duplicate, const}
 */
var React = {};

/**
 * @param  {*} defaultValue
 * @return {React.Context}
 */
React.createContext = function(defaultValue) {};

/**
 * @typedef {
 *   boolean|number|string|React.Component|
 *   Array.<boolean>|Array.<number>|Array.<string>|Array.<React.Component>
 * }
 */
React.ChildrenArgument;

/**
 * @param {*} componentClass
 * @param {Object=} props
 * @param {...React.ChildrenArgument} children
 * @return {React.Component}
 */
React.createElement = function(componentClass, props, children) {};

/**
 * @interface
 */
React.Context = function() {}

React.Context.prototype.Provider = function() {};
React.Context.prototype.Consumer = function() {};

/**
 * @interface
 */
React.Component = function() {};

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