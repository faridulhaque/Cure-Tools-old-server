const express = require("express");
const cors = require("cors");
require("dotenv").config();
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

async function run() {
  try {
    await client.connect();

    const ordersCollection = client.db("cureTools").collection("orders");
    const toolsCollection = client.db("cureTools").collection("tools");
    const usersCollection = client.db("cureTools").collection("users");

    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });
    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolsCollection.findOne(query);
      res.send(tool);
    });
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    });
    app.get("/myOrders", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    app.delete('/order/:id', (req, res)=>{
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = ordersCollection.deleteOne(query);
      res.send(order);
    })

    // saving user data in db 

    app.put("/user/:email", async (req, res)=>{
      const email = req.params.email;
      const user = req.body;
      const query = {email: email}
      const options = {upsert: true};
      const info = {
        $set: {
          email: user.email,
          name: user.name,
        }
      }
      const result = await usersCollection.updateOne(query, info, options);
      res.send(result);
    })
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
