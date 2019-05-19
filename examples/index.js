/* @flow */

const express = require("express");

const port = process.env.PORT || 8080;
const app  = express();

try {
  app.use("/blog", require("./blog/dist/server.js"));
}
catch(e) {
  console.error("Error loading Blog Example");
  console.error(e);
}

// Static examples
app.use(express.static(__dirname));

app.listen(port, () => console.log(`Examples are now available on port ${port}.`));