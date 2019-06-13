import { config }     from "./build/config";
import crustateReact  from "./react/rollup.config";
import crustatePreact from "./preact/rollup.config";
import exampleBlog    from "./examples/blog/rollup.config";
import exampleCounter from "./examples/counter/rollup.config";
import exampleTodomvc from "./examples/todomvc/rollup.config";

export default [
  config({
    input:   "src/index.js",
    output:  "dist/index",
    externs: ["build/externs/crustate.js", "build/exports/crustate.js"],
  }),
  crustateReact,
  crustatePreact,
  ...exampleBlog,
  exampleCounter,
  exampleTodomvc,
];