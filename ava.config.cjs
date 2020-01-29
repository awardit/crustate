/* @flow */

const babel = require("./build/babel");

module.exports = {
  babel: {
    testOptions: {
      ...babel,
      ignore: [],
    },
  },
  files: [
    "**/*.test.js",
  ],
  require: [
    "./test/_register",
  ],
  powerAssert: true,
};
