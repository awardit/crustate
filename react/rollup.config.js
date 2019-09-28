import { config } from "../build/config";

export default config({
  input: "react/src/index.js",
  output: "react/dist/index",
  external: ["crustate", "react", "react-dom"],
  externs: [
    "build/externs/crustate.js",
    "build/externs/react.js",
    "build/exports/react.js",
  ],
});
