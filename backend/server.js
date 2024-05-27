const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

//mongodb+srv://kcstungal:pv5tXITn7WzhhO3L@cluster0.oduevtf.mongodb.net/
//mongodb+srv://kcstungal:<password>@cluster0.oduevtf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
const uri = "mongodb+srv://kcstungal:pv5tXITn7WzhhO3L@cluster0.oduevtf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(bodyParser.json());

let database;

async function connectToDatabase() {
  try {
    await client.connect();
    database = client.db('Temp'); 
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

connectToDatabase();

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

app.post('/data', async (req, res) => {
  const { temperature, humidity, time } = req.body;

  try {
    const collection = database.collection('records');
    const doc = {
      temperature,
      humidity,
      time
    };

    await collection.insertOne(doc);
    io.emit('new-data', doc);  
    res.status(200).send('Data inserted');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error inserting data');
  }
});

app.get('/get-data', async (req, res) => {
  try {
    const collection = database.collection('records');
    const data = await collection.find({}).toArray();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching data');
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
