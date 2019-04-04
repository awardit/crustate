import { config }     from "./build/config";
import gurkaReact     from "./react/rollup.config";
import gurkaPreact    from "./preact/rollup.config";
import exampleCounter from "./examples/counter/rollup.config";

export default [
  config({
    input:   "src/index.js",
    output:  "dist/index",
    externs: ["externs/gurka.js", "src/externs.js"],
  }),
  gurkaReact,
  gurkaPreact,
  exampleCounter,
];