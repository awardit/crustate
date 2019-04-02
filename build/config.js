import babelPlugin     from "rollup-plugin-babel";
import closureCompiler from '@ampproject/rollup-plugin-closure-compiler';
import gzip            from "rollup-plugin-gzip";
import resolve         from "rollup-plugin-node-resolve";

const babelConfig  = require("./build/babel.js");
const isProduction = process.env.NODE_ENV === "production";
const babel        = babelPlugin(babelConfig);

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
