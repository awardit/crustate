import alias      from "rollup-plugin-alias";
import path       from "path";
import { config } from "../build/config";

export default config({
  input:    "preact/src/index.js",
  output:   "preact/dist/index",
  plugins:  [
    alias({
      "gurka/react": path.join(__dirname, "./react/src/index"),
      "react":       path.join(__dirname, "./preact/src/react-shim"),
      "react-dom":   path.join(__dirname, "./preact/src/react-shim"),
    }),
  ],
  external: ["gurka", "preact", "preact/hooks"],
  externs:  [
    "resources/externs/gurka.js",
    "resources/externs/react.js",
    "resources/externs/preact.js",
    "resources/exports/react.js",
  ],
});