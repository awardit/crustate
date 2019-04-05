// Common Babel configuration for building and unit-testing

module.exports = {
  compiler: {
    babelrc:         false,
    presets:         [
      ["@babel/preset-react"],
    ],
    plugins: [
      // We cannot use the preset since this must go before class-properties to avoid
      // emitting `this.propertyName = void 0;` for typed class properties
      ["@babel/plugin-transform-flow-strip-types"],
      // Loose mode for smaller and faster code
      ["@babel/plugin-proposal-class-properties", { loose: true }],
      // Loose mode for smaller and faster code
      ["@babel/plugin-transform-classes", { loose: true }],
    ],
  },
  test: {
    babelrc:         false,
    presets:         [
      ["@babel/preset-react"],
      ["@babel/preset-env", {
        loose:            true,
        shippedProposals: true,
        targets: {
          node:    8,
          firefox: 50,
          ie:      11,
        },
        exclude: [ "transform-typeof-symbol" ]
      }],
    ],
    plugins: [
      // We cannot use the preset since this must go before class-properties to avoid
      // emitting `this.propertyName = void 0;` for typed class properties
      ["@babel/plugin-transform-flow-strip-types"],
      // Loose mode for smaller and faster code
      ["@babel/plugin-proposal-class-properties", { loose: true }],
    ],
  },
};