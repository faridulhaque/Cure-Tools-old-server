const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// using middleware

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.bygyo.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const receivedToken = req.headers.authorization;
  if (!receivedToken) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = receivedToken.split(" ")[1];
  jwt.verify(token, "12345678", function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();

    const ordersCollection = client.db("cureTools").collection("orders");
    const toolsCollection = client.db("cureTools").collection("tools");
    const usersCollection = client.db("cureTools").collection("users");
    const reviewsCollection = client.db("cureTools").collection("reviews");
    // payment setup
    app.post("/create-payment-intent", async (req, res) => {
      const items = req.body;
      const price = parseFloat(items.price);

      const amount = price * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      console.log(paymentIntent.client_secret);
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });

    // getting reviews for reviews section in review page.
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolsCollection.findOne(query);
      res.send(tool);
    });
    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    });
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    });
    app.post("/tools", async (req, res) => {
      const tools = req.body;
      const result = await toolsCollection.insertOne(tools);
      res.send(result);
    });
    app.get("/myOrders", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    // find an admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // deleting item from orders
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.deleteOne(query);
      res.send(order);
    });
    // deleting product
    app.delete("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolsCollection.deleteOne(query);
      res.send(tool);
    });
    // delete an user by admin from manage users
    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // saving user data in db

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const info = {
        $set: {
          email: user.email,
          name: user.name,
          img: user.img,
          address: user.address,
          phone: user.phone,
        },
      };
      const result = await usersCollection.updateOne(query, info, options);
      const token = jwt.sign({ email: email }, "12345678", { expiresIn: "1d" });
      console.log(token);
      res.send({ result, token });
    });

    // making an admin
    app.put("/user/admin/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const info = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, info, options);
      res.send(result);
    });
    // payment confirmation

    app.put("/order/payment/:id", async (req, res) => {
      const id = req.params.id;
      const bodyData = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const info = {
        $set: {
          transaction: bodyData.transaction,
          payment: bodyData.payment,
        },
      };
      const result = await ordersCollection.updateOne(filter, info, options);
      res.send(result);
    });
    app.put("/order/shipment/:id", async (req, res) => {
      const id = req.params.id;
      const bodyData = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const info = {
        $set: {
          shipment: bodyData.shipment,
        },
      };
      const result = await ordersCollection.updateOne(filter, info, options);
      res.send(result);
    });

    //store reviews from the users to db
    app.put("/review/:email", async (req, res) => {
      const email = req.params.email;

      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const info = {
        $set: {
          email: user.email,
          name: user.name,
          img: user.img,
          review: user.review,
          rating: user.rating,
        },
      };
      const result = await reviewsCollection.updateOne(query, info, options);

      res.send(result);
    });
    //getting all users
    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });
    app.get("/orders", async (req, res) => {
      const query = {};
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    // getting single user for profile info
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await usersCollection.findOne(filter);
      res.send(user);
    });
    app.get("/admins", async (req, res) => {
      const filter = { role: "admin" };
      const cursor = usersCollection.find(filter);
      const admins = await cursor.toArray();
      res.send(admins);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => {
  console.log("listening on port", port);
});
