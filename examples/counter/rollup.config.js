import resolve  from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import babel    from "rollup-plugin-babel";
import replace  from "rollup-plugin-replace";

const babelOpts = {
  exclude:         "node_modules/**",
  babelrc:         false,
  externalHelpers: false,
  runtimeHelpers:  true,
  presets:         [
    ["@babel/preset-react"],
    ["@babel/preset-env", {
      loose:            true,
      shippedProposals: true,
      targets: {
        node:    8,
        firefox: 50,
        ie:      11,
      },
      exclude: [ "transform-typeof-symbol" ]
    }],
  ],
  plugins: [
    ["@babel/plugin-transform-flow-strip-types"],
    ["@babel/plugin-proposal-class-properties", { loose: true }],
  ],
};

export default {
  input: "examples/counter/src/index.js",
  output: {
    file:      "examples/counter/dist/index.js",
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