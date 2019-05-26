import resolvePlugin from "rollup-plugin-node-resolve";
import { alias
       , babel
       , commonjs
       , postcss
       , replace
       , resolve } from "../../build/example.js";

export default [
  {
    input: "examples/blog/src/client.js",
    output: {
      file:      "examples/blog/dist/client.js",
      format:    "iife",
      sourcemap: true,
    },
    plugins: [
      alias,
      babel,
      postcss,
      commonjs,
      resolve,
      replace,
    ],
  },
  {
    input: "examples/blog/src/server.js",
    output: {
      file:      "examples/blog/dist/server.js",
      format:    "cjs",
      sourcemap: true,
    },
    plugins: [
      alias,
      babel,
      postcss,
      resolvePlugin({ mainFields: ["module", "main"]}),
    ],
    external: [
      "express",
      "path",
      "fs",
      "react",
      "react-router",
      "react-is",
      "react-dom",
      "react-dom/server",
    ],
  }
];