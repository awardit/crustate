/**
 * @fileoverview Public externs to prevent name-mangling for specific input properties
 * @externs
 */

// Defines for import-statements

/**
 * @suppress {duplicate}
 */
var sendMessage = gurka.sendMessage;
/**
 * @suppress {duplicate}
 */
var createState = gurka.createState;
/**
 * @suppress {duplicate}
 */
var stateName = gurka.stateName;
/**
 * @suppress {duplicate}
 */
var stateData = gurka.stateData;
/**
 * @suppress {duplicate}
 */
var getNestedInstance = gurka.getNestedInstance;
/**
 * @suppress {duplicate}
 */
var addListener = gurka.addListener;
/**
 * @suppress {duplicate}
 */
var removeListener = gurka.removeListener;

// Punblic API for CommonJS
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
