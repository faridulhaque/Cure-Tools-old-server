const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;


// dbuserfm
// 9OXnr2xLuZPuY4RC

// using middleware

app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.bygyo.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
  try{
    await client.connect();
    const toolsCollection = client.db('cureTools').collection('tools');
    app.get('/tools', async (req, res) =>{
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
  })
  }
  finally{

  }
}
run().catch(console.dir);

app.get('/', (req, res) =>{
    res.send('hello world')
});

app.listen(port, () =>{
    console.log('listening on port', port);
})