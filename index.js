const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
cors({
  origin: [
    "http://localhost:5173",
    "https://pawspalace-pet-adoption.web.app",
    "https://pawspalace-pet-adoption.firebaseapp.com",
  ],
  credentials: true,
});
app.use(express.json());

// MongoDB Starts Here

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
    // await client.db("admin").command({ ping: 1 });
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
      console.log(req.query.email);

      let query = {};

      if (req.query?.email) {
        query = { addedByUser: req.query.email };
      }
      const result = await petCollection.find(query).toArray();
      res.send(result);
    });

    // ALL PETS API FOR PAGINATION
    // app.get("/allPets", async (req, res) => {
    //   const pets = req.query;
    //   const page = parseInt(pets.page);
    //   const size = parseInt(pets.size);

    //   const cursor = petCollection
    //     .find()
    //     .skip(page * size)
    //     .limit(size);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    // TOTAL PETS COUNT
    // app.get("/petsCount", async (req, res) => {
    //   const count = await petCollection.estimatedDocumentCount();
    //   console.log("Total Pets= ", count);
    //   res.send({ count });
    // });

    app.patch("/allpets/:id", async (req, res) => {
      const pet = req.body;
      const id = req.params.id;
      console.log("pet", pet);
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          adoptedStatus: pet.adopted,
          reqPersonName: pet.reqPersonName,
          reqPersonAddress: pet.reqPersonAddress,
          reqPersonEmail: pet.reqPersonEmail,
          reqPersonPhone: pet.reqPersonPhone,
        },
      };

      const result = await petCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // ADOPTED PETS IN DB
    const adoptedPetsCollection = client
      .db("PawspalacePetAdoptionDB")
      .collection("adoptedPets");

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

    // added pets related apis
    app.get("/addedPets", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.send(result);
    });

    app.get("/addedPets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.findOne(query);
      res.send(result);
    });

    app.post("/addedPets", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await petCollection.insertOne(item);
      res.send(result);
    });

    app.patch("/addedPets/:id", async (req, res) => {
      const pet = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: pet.name,
          category: pet.category,
          age: pet.age,
          location: pet.location,
          shortDescription: pet.short,
          longDescription: pet.long,
          image: pet.image,
        },
      };

      const result = await petCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/addedPets/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
    });

    const donationCampaignCollection = client
      .db("PawspalacePetAdoptionDB")
      .collection("donationCampaigns");

    // donation campaign related apis
    app.get("/donation", async (req, res) => {
      console.log(req.query.email);

      let query = {};

      if (req.query?.email) {
        query = { addedByUser: req.query.email };
      }
      const result = await donationCampaignCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/donation/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCampaignCollection.findOne(query);
      res.send(result);
    });

    app.post("/donation", verifyToken, async (req, res) => {
      const item = req.body;
      const result = await donationCampaignCollection.insertOne(item);
      res.send(result);
    });

    app.patch("/donation/:id", async (req, res) => {
      const donation = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: donation.campaignName,
          amount: donation.maxAmount,
          date: donation.lastDate,
          shortDescription: donation.short,
          longDescription: donation.long,
          image: donation.image,
        },
      };

      const result = await donationCampaignCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    app.delete("/donation/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCampaignCollection.deleteOne(query);
      res.send(result);
    });
    // PAYMENT STRIPE
    const paymentCollection = client
      .db("PawspalacePetAdoptionDB")
      .collection("payments");

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log("payment info", payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };

      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
