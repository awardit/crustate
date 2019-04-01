/**
 * @fileoverview
 *
 * @externs
 */
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
 * @type {!string}
 */
process.env.NODE_ENV;

var console;

/**
 * @param {...*} params
 */
console.log = function(params) {}

function require(module) {}
