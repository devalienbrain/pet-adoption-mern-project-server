const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("PawsPalace-pet adoption SERVER is running!");
});

app.listen(port, () => {
  console.log(`PawsPalace-pet adoption SERVER running on port: ${port}`);
});

// MIDDLEWARE
//To Send Token From Server Cross Origin Setup In Cors Middleware
app.use(cors());
app.use(express.json());

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

    // JWT related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(req.headers);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middleware to verify token
    const verifyToken = (req, res, next) => {
      // console.log("Inside verifyToken:", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      } else {
        const token = req.headers.authorization.split(" ")[1];
        console.log("Token:", token);
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: "forbidden access" });
          }
          req.decoded = decoded;
          next();
        });
      }
    };

    // middleware to verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // User related api
    const usersCollection = client
      .db("PawspalacePetAdoptionDB")
      .collection("users");

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers.authorization);
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Call api from useAdmin client side
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const alreadyExistUser = await usersCollection.findOne(query);
      if (alreadyExistUser) {
        return res.send({ message: "User already Exists!", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // handle make a user admin api
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedRole = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedRole);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // PET CATEGORIES API
    const petCategoriesCollection = client
      .db("PawspalacePetAdoptionDB")
      .collection("categories");

    app.get("/petCategories", async (req, res) => {
      const cursor = petCategoriesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // API TO LOAD ALL PETS
    const petCollection = client
      .db("PawspalacePetAdoptionDB")
      .collection("allPets");
    app.get("/allPets", async (req, res) => {
      const cursor = petCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // ALL PETS API FOR PAGINATION
    app.get("/allPets", async (req, res) => {
      const pets = req.query;
      const page = parseInt(pets.page);
      const size = parseInt(pets.size);

      const cursor = petCollection
        .find()
        .skip(page * size)
        .limit(size);
      const result = await cursor.toArray();
      res.send(result);
    });

    // TOTAL PETS COUNT
    app.get("/petsCount", async (req, res) => {
      const count = await petCollection.estimatedDocumentCount();
      console.log("Total Pets= ", count);
      res.send({ count });
    });

    // ADOPTED PETS IN DB
    const adoptedPetsCollection = client
      .db("PawspalacePetAdoptionDB")
      .collection("adoptedPets");

    // app.get("/borrowedBooks", async (req, res) => {
    //   const cursor = borrowedBooksCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    // GET SOME DATA (CONDITIONAL) USING QUERY
    app.get("/adoptedPets", async (req, res) => {
      let query = {};

      if (req.query?.email) {
        query = { userEmail: req.query.email };
      }
      const result = await adoptedPetsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/adoptedPets", async (req, res) => {
      const adoptedPets = req.body;
      console.log(adoptedPets);
      const result = await adoptedPetsCollection.insertOne(adoptedPets);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
