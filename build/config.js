import path from "path";
import babelPlugin from "rollup-plugin-babel";

// Rollup configuration compiler does not respect __dirname, so we have to rely
// on the current working directory:
const babel = babelPlugin(require(path.join(process.cwd(), "build", "babel")));

export const config = ({ input, output, plugins = [], external = [] }) => ({
  input,
  output: [
    {
      file: `${output}.esm.js`,
      sourcemap: true,
      format: "esm",
    },
    {
      file: `${output}.js`,
      sourcemap: true,
      format: "cjs",
    },
  ],
  plugins: plugins.concat([
    babel,
  ]),
  external,
});

