/* @flow */

const babel = require("./build/babel");

export default {
  babel: {
    testOptions: {
      ...babel,
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
