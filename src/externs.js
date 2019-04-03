/**
 * @fileoverview Public externs to prevent name-mangling for specific input properties
 *
 * @externs
 */

// Punblic API for CommonJS
//
// NOTE: Keep in sync with index.js export
/**
 * @type {!Object}
 */
var exports = gurka;

/* Public symbols, by naming them here Google Closure compiler will not rename them */
var addListener;
var addSubscriber;
var emit;
var ensureState;
var getData;
var getName;
var getNested;
var getPath;
var getStorage;
var init;
var listeners;
var name;
var registerState;
var removeAllListeners;
var removeListener;
var removeSubscriber;
var sendMessage;
var stateDefinition;
var subscribers;
var subscriptions;