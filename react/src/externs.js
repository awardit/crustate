/**
 * @fileoverview Public externs to prevent name-mangling for specific input properties
 * @externs
 */

// Defines for import-statements

// Public API for CommonJS
//
// NOTE: Keep in sync with index.js export

/**
 * @public
 * @record
 */
function ReactState() {}

/**
 * @public
 */
ReactState.prototype.Consumer;
/**
 * @public
 */
ReactState.prototype.Provider;
/**
 * @public
 */
ReactState.prototype.useData;

/**
 * @type {!Object}
 */
var exports;

exports.StateContext;
exports.RootProvider;
exports.createReactState;
exports.useSendMessage;
