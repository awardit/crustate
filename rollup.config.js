import { config } from "./build/config";

export default config({
  input: "src/index.js",
  output: "dist",
  preserveModules: true,
});
