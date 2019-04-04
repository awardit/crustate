import { config } from "../build/config";

export default config({
  input:    "react/src/index.js",
  output:   "react/dist/index",
  external: ["gurka", "react", "react-dom"],
  externs:  ["resources/externs/gurka.js", "resources/externs/react.js", "resources/exports/react.js"],
});