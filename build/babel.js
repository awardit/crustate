// Common Babel configuration for building and unit-testing

module.exports = {
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
    ["@babel/plugin-proposal-class-properties", { loose: true }],
  ],
};
