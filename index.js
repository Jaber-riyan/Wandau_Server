const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// require dotenv 
require('dotenv').config();
// import 'dotenv/config'
const port = process.env.PORT || 5000;


const app = express();

// middle ware 
app.use(express.json());
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://hirespheree.netlify.app',
    ],
    credentials: true,
}));
// cookie parser use 
app.use(cookieParser());



const verifyToken = (req, res, next) => {
    console.log("Inside the verify token");
    const token = req?.cookies?.authToken;
    // console.log(token);
    if (!token) {
        return res.status(401).json({ message: "Unauthorized Access!" });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: err.message });
        }
        req.user = decoded;
        next();
    })
}


// mongo db connection 
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.4ayta.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        console.log("successfully connected to MongoDB!");

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', async (req, res) => {
    res.send("TimeTreasures Server Running.....");
})

app.listen(port, () => {
    console.log("App Running on port ", port);
})