import alias      from "rollup-plugin-alias";
import path       from "path";
import { config } from "../build/config";

export default config({
  input:    "preact/src/index.js",
  output:   "preact/dist/index",
  plugins:  [
    alias({
      "crustate/react": path.join(__dirname, "./react/src/index"),
      "react":          path.join(__dirname, "./preact/src/react-shim"),
      "react-dom":      path.join(__dirname, "./preact/src/react-shim"),
    }),
  ],
  external: ["crustate", "preact", "preact/hooks"],
  externs:  [
    "build/externs/crustate.js",
    "build/externs/react.js",
    "build/externs/preact.js",
    "build/exports/react.js",
  ],
});