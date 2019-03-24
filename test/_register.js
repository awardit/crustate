/* @flow */
require("@babel/register")({
  "presets": [
    ["@babel/preset-env", {
      "loose":            true,
      "shippedProposals": true,
      "targets": {
        "node":     "current",
        "browsers": "last 2 versions"
      },
      "exclude": [ "transform-typeof-symbol" ]
    }],
    ["@babel/preset-flow"],
    ["@babel/preset-react"]
  ]
})