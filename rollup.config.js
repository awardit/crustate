import { config }     from "./build/config";
import crustateReact  from "./react/rollup.config";
import crustatePreact from "./preact/rollup.config";
import exampleCounter from "./examples/counter/rollup.config";

export default [
  config({
    input:   "src/index.js",
    output:  "dist/index",
    externs: ["resources/externs/crustate.js", "resources/exports/crustate.js"],
  }),
  crustateReact,
  crustatePreact,
  exampleCounter,
];