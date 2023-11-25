const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("PawsPalace-pet adoption SERVER is running!");
});

app.listen(port, () => {
  console.log(`PawsPalace-pet adoption SERVER running on port: ${port}`);
});
