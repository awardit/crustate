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
var exports = crustate;

/* Public symbols, by naming them here Google Closure compiler will not rename them */
var addListener;
var addSubscriber;
var data;
var defName;
var emit;
var filter;
var getData;
var getName;
var getNested;
var getNestedOrCreate;
var getPath;
var getSnapshot;
var getStorage;
var init;
var listeners;
var name;
var nested;
var params;
var passive;
var registerState;
var removeAllListeners;
var removeListener;
var removeSubscriber;
var sendMessage;
var stateDefinition;
var subscribers;
var subscriptions;
var tryRegisterState;