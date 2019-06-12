/* @flow */

export const debugAssert = process.env.NODE_ENV === "production" ? (cond: boolean, msg: string) => {} : (cond: boolean, msg: string) => {
  if( ! cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
};