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
function StateData() {}

/**
 * @public
 */
StateData.prototype.Consumer;
/**
 * @public
 */
StateData.prototype.TestProvider;
/**
 * @public
 */
StateData.prototype.Provider;
/**
 * @public
 */
StateData.prototype.state;

/**
 * @type {!Object}
 */
var exports;

exports.StateContext;
exports.StorageProvider;
exports.createStateData;
exports.useSendMessage;
exports.useData;
