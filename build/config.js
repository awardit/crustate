import babelPlugin     from "rollup-plugin-babel";
import replacePlugin   from "rollup-plugin-replace";
import closureCompiler from '@ampproject/rollup-plugin-closure-compiler';
import gzip            from "rollup-plugin-gzip";

// Rollup configuration compiler does not respect __dirname, so we have to rely
// on the current working directory:
const babelConfig  = require("./build/babel.js");
const isProduction = process.env.NODE_ENV === "production";
const babel        = babelPlugin(babelConfig.compiler);
// Use no formatting options for production
const formatting   = isProduction ? { } : { formatting: "PRETTY_PRINT" };

const compiler = externs => closureCompiler({
  ...formatting,
  compilation_level:       "ADVANCED",
  assume_function_wrapper: true,
  warning_level:           "VERBOSE",
  language_in:             "ECMASCRIPT_2018",
  language_out:            "ECMASCRIPT5_STRICT",
  // Custom environment since we do not always run in browser
  env:                     "CUSTOM",
  // We must have externs to be able to build using CUSTOM
  externs:                 ["build/externs/env.js"].concat(externs),
  use_types_for_optimization: true,
});

export const config = ({ input, output, plugins = [], external = [], externs }) => ({
  input,
  output: [
    {
      file:      `${output}.esm.js`,
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
    isProduction ? replacePlugin({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }) : null,
    babel,
    compiler(externs),
    isProduction ? gzip({ level: 9 }) : null,
  ]),
  external,
})
