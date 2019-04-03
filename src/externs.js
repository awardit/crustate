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
var init;
var receive;
var subscriptions;
var addListener;
var removeListener;
var removeAllListeners;
var listeners;
var emit;
var registerState;
var ensureState;
var sendMessage;
var addSubscriber;
var removeSubscriber;
var getNested;