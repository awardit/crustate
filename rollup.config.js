import { config }  from "./build/config";
import gurkaReact  from "./react/rollup.config";
import gurkaPreact from "./preact/rollup.config";

export default [
  config({
    input:   "src/index.js",
    output:  "dist/index",
    externs: ["src/externs.js"]
  }),
  gurkaReact,
  gurkaPreact,
];