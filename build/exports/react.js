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
StateData.prototype.model;

/**
 * @public
 * @constructor
 * @extends React.Component
 */
function DataProvider() {}

DataProvider.prototype.props;
/**
 * @type {!boolean}
 */
DataProvider.prototype.props.wrapNested;
DataProvider.prototype.props.chidren;
DataProvider.prototype.contextType;
DataProvider.prototype.defaultProps;

/**
 * @type {!Object}
 */
var exports;

exports.StateContext;
exports.StorageProvider;
exports.createStateData;
exports.useSendMessage;
exports.useData;

// make sure these are not mangled
var contextType;
var defaultProps;
var displayName;
var storage;
var wrapNested;

