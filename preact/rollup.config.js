import alias from "@rollup/plugin-alias";
import nodeResolve from "@rollup/plugin-node-resolve";
import path from "node:path";
import { config } from "../build/config";

export default config({
  input: "preact/src/index.js",
  output: "preact/dist",
  plugins: [
    alias({
      entries: [
        { find: "react", replacement: path.join(__dirname, "./src/react-shim") },
        { find: "react-dom", replacement: path.join(__dirname, "./src/react-shim") },
      ],
    }),
    nodeResolve(),
  ],
  external: ["crustate", "preact", "preact/hooks"],
});
