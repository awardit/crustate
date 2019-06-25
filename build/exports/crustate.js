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
var emit;
var filter;
var getData;
var getModel;
var getName;
var getNested;
var getNestedOrCreate;
var getPath;
var getSnapshot;
var getStorage;
var id;
var init;
var listeners;
var name;
var nested;
var params;
var passive;
var registerModel;
var removeAllListeners;
var removeListener;
var removeNested;
var removeSubscriber;
var replyMessage;
var restoreSnapshot;
var sendMessage;
var subscribe;
var subscriptions;
var tryRegisterModel;