/* @flow */

/**
 * Debug assertion, will be a noop in production builds.
 */
export const debugAssert = (cond: boolean, msg: string): void => {
  if(process.env.NODE_ENV !== "production" && ! cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
};
