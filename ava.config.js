/* @flow */

const babel = require("./build/babel");

export default {
  babel: {
    testOptions: {
      ...babel.test,
      ignore: [],
    },
  },
  files: [
    "**/*.test.js",
  ],
  sources: [
    "src/**/*.js",
    "**/src/**/*.js",
  ],
  require: [
    "./test/_register",
  ],
  powerAssert: true,
};
