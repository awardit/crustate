import alias from "rollup-plugin-alias";
import path from "path";
import { config } from "../build/config";

export default config({
  input: "preact/src/index.js",
  output: "preact/dist/index",
  plugins: [
    alias({
      entries: [
        { find: "crustate/react", replacement: path.join(__dirname, "./react/src/index") },
        { find: "react", replacement: path.join(__dirname, "./preact/src/react-shim") },
        { find: "react-dom", replacement: path.join(__dirname, "./preact/src/react-shim") },
      ],
    }),
  ],
  external: ["crustate", "preact", "preact/hooks"],
});
