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

// MongoDB Starts Here

require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

console.log(process.env.DB_USER, process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m38robg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged. Successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
