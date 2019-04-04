import { config }     from "./build/config";
import gurkaReact     from "./react/rollup.config";
import gurkaPreact    from "./preact/rollup.config";
import exampleCounter from "./examples/counter/rollup.config";

export default [
  config({
    input:   "src/index.js",
    output:  "dist/index",
    externs: ["resources/externs/gurka.js", "resources/exports/gurka.js"],
  }),
  gurkaReact,
  gurkaPreact,
  exampleCounter,
];