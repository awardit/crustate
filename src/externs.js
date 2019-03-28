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

/**
 * Public interface type
 *
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
exports.update;
exports.updateAndSend;
exports.createState
exports.StateRoot;
exports.sendMessage;
exports.newStateInstance;
exports.getState;