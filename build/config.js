import babelPlugin from "rollup-plugin-babel";
import replacePlugin from "rollup-plugin-replace";
import { terser } from "rollup-plugin-terser";
import gzip from "rollup-plugin-gzip";

export { default as aliasPlugin } from "rollup-plugin-alias";

// Rollup configuration compiler does not respect __dirname, so we have to rely
// on the current working directory:
const babel = babelPlugin(require("./build/babel.js"));
const isProduction = process.env.NODE_ENV === "production";

const terserInstance = terser({
  warnings: true,
  compress: {
    ecma: 5,
    arguments: true,
    hoist_funs: true,
    hoist_vars: true,
    keep_fargs: false,
    passes: 3,
    pure_getters: true,
    unsafe: true,
    unsafe_comps: true,
    unsafe_math: true,
    unsafe_proto: true,
  },
  mangle: {
    eval: true,
    properties: {
      keep_quoted: true,
      regex: /^_.*/,
    },
  },
  module: true,
  output: {
    beautify: !isProduction,
    braces: !isProduction,
    indent_level: 2,
    ecma: 5,
    wrap_func_args: false,
  },
  toplevel: true,
});

export const config = ({ input, output, plugins = [], external = [] }) => ({
  input,
  output: [
    {
      file: `${output}.esm.js`,
      sourcemap: true,
      format: "esm",
    },
    {
      file: `${output}.js`,
      sourcemap: true,
      format: "cjs",
    },
  ],
  plugins: plugins.concat([
    isProduction ? replacePlugin({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }) : null,
    babel,
    terserInstance,
    isProduction ? gzip({ level: 9 }) : null,
  ]),
  external,
});

