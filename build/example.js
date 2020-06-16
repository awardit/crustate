import resolvePlugin from "@rollup/plugin-node-resolve";
import commonjsPlugin from "@rollup/plugin-commonjs";
import babelPlugin from "@rollup/plugin-babel";
import replacePlugin from "@rollup/plugin-replace";
import aliasPlugin from "@rollup/plugin-alias";
import postcssPlugin from "rollup-plugin-postcss";

export const alias = aliasPlugin({
  entries: [
    // More specific needs to be first, otherwise will alias try to suffix
    // `/react` on top of `index.esm.js`:
    { find: "crustate/react", replacement: "react/dist/esm/index.js" },
    { find: "crustate", replacement: "dist/esm/index.js" },
  ],
});

export const babel = babelPlugin({
  exclude: "node_modules/**",
  babelrc: false,
  babelHelpers: "bundled",
  presets: [
    ["@babel/preset-react"],
    ["@babel/preset-env", {
      loose: true,
      shippedProposals: true,
      targets: {
        node: 8,
        firefox: 50,
        ie: 11,
      },
      exclude: ["transform-typeof-symbol"],
    }],
  ],
  plugins: [
    ["@babel/plugin-transform-flow-strip-types"],
    ["@babel/plugin-proposal-class-properties", { loose: true }],
  ],
});

export const commonjs = commonjsPlugin();

export const postcss = postcssPlugin({
  extract: true,
});

export const replace = replacePlugin({
  "process.env.NODE_ENV": JSON.stringify("production"),
});

export const resolve = resolvePlugin({ mainFields: ["browser", "module", "main"] });

export const config = path => ({
  input: `${path}/src/index.js`,
  output: {
    file: `${path}/dist/index.js`,
    format: "iife",
    sourcemap: true,
  },
  plugins: [
    alias,
    babel,
    postcss,
    commonjs,
    resolve,
    replace,
  ],
});
