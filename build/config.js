import path from "path";
import babelPlugin from "rollup-plugin-babel";

// Rollup configuration compiler does not respect __dirname, so we have to rely
// on the current working directory:
const babel = babelPlugin(require(path.join(process.cwd(), "build", "babel")));

export const config = ({
  input,
  output,
  plugins = [],
  external = [],
  preserveModules = false,
}) => ({
  input,
  output: [
    {
      dir: `${output}/esm`,
      sourcemap: true,
      format: "esm",
    },
    {
      dir: `${output}/cjs`,
      sourcemap: true,
      format: "cjs",
    },
  ],
  preserveModules,
  plugins: plugins.concat([
    babel,
  ]),
  external,
});

