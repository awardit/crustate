import { config } from "../build/config";

export default config({
  input:   "react/src/index.js",
  output:  "react/dist/index",
  externs: ["externs/gurka.js", "externs/react.js", "react/src/externs.js"],
});