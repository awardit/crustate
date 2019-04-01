import resolve  from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import babel    from "rollup-plugin-babel";
import replace  from "rollup-plugin-replace";

const babelOpts = {
  exclude:         "../../node_modules/**",
  babelrc:         false,
  externalHelpers: false,
  runtimeHelpers:  true,
  presets: [
    ["@babel/preset-env", {
      "loose":            true,
      "shippedProposals": true,
      "targets": {
        "firefox": 50,
      },
      "exclude": [ "transform-typeof-symbol" ]
    }],
    ["@babel/preset-react"],
  ],
  plugins: [
    "@babel/plugin-proposal-class-properties",
  ],
};

export default {
  input: "src/index.js",
  output: {
    file:      "dist/index.js",
    format:    "iife",
    sourcemap: true,
  },
  plugins: [
    babel(babelOpts),
    commonjs(),
    resolve({
      browser: true,
      module:  true,
    }),
    replace({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
  ],
};