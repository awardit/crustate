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
var addModel;
var addSubscriber;
var broadcastMessage;
var createState;
var data;
var emit;
var matching;
var getData;
var getModel;
var getName;
var getPath;
var getSnapshot;
var getState;
var getStorage;
var id;
var init;
var listeners;
var messages;
var name;
var nested;
var params;
var passive;
var removeAllListeners;
var removeListener;
var removeState;
var removeSubscriber;
var replyMessage;
var restoreSnapshot;
var sendMessage;
var subscribe;
var subscriptions;