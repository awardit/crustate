import alias      from "rollup-plugin-alias";
import { config } from "../build/config";

export default config({
  input:    "preact/src/index.js",
  output:   "preact/dist/index",
  plugins:  [
    alias({
      "react":     "preact",
      "react-dom": "preact",
    }),
  ],
  external: ["gurka", "preact"],
  externs:  ["externs/gurka.js", "externs/react.js", "react/src/externs.js"],
});