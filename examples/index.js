/* @flow */

const express = require("express");

const port = process.env.PORT || 8080;
const app = express();

// Static examples
app.use(express.static(__dirname));

try {
  app.use("/blog", (require("./blog/dist/server.js"): any));
}
catch (e) {
  console.error("Error loading Blog Example");
  console.error(e);
}

app.listen(port, () => console.log(`Examples are now available on port ${port}.`));
