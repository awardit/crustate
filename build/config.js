import babelPlugin     from "rollup-plugin-babel";
import closureCompiler from '@ampproject/rollup-plugin-closure-compiler';
import gzip            from "rollup-plugin-gzip";
import resolve         from "rollup-plugin-node-resolve";

const isProduction = process.env.NODE_ENV === "production";
const babel        = babelPlugin({
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
    // We cannot use the preset since this must go before class-properties to avoid
    // emitting `this.propertyName = void 0;` for typed class properties
    ["@babel/plugin-transform-flow-strip-types"],
    ["@babel/plugin-proposal-class-properties", { loose: true }],
  ],
});

const compiler = externs => closureCompiler({
  compilation_level:       "ADVANCED",
  assume_function_wrapper: true,
  formatting:              isProduction ? "PRINT_INPUT_DELIMITER" : "PRETTY_PRINT",
  warning_level:           "VERBOSE",
  language_in:             "ECMASCRIPT_2015",
  language_out:            "ECMASCRIPT_2015",
  // Custom environment since we do not always run in browser
  env:                     "CUSTOM",
  // We must have externs to be able to build using CUSTOM
  externs:                 ["externs/env.js"].concat(externs),
});

export const config = ({ input, output, plugins = [], external = [], externs }) => ({
  input,
  output: [
    {
      file:      `${output}.mjs`,
      sourcemap: true,
      format:    "esm",
    },
    {
      file:      `${output}.js`,
      sourcemap: true,
      format:    "cjs",
    },
  ],
  plugins: plugins.concat([
    babel,
    resolve({
      module:      true,
      jsnext:      true,
      modulesOnly: true,
    }),
    compiler(externs),
    isProduction ? gzip({ level: 9 }) : null,
  ]),
  external,
})
