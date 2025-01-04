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
        'https://wandau.netlify.app',
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

        // Database 
        const database = client.db('Wandau');
        // All Artifacts 
        const allArtifactsCollection = database.collection('Artifacts');

        // JWT token create and remove APIS 
        // JWT token create API 
        app.post('/jwt/create', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '6h' });
            res
                .cookie('authToken', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
                })
                .json({
                    status: true
                })
        })

        // JWT token remove API 
        app.post('/jwt/remove', async (req, res) => {
            res
                .clearCookie('authToken', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
                })
                .json({
                    status: true
                })
        })

        // Add artifacts API 
        app.post('/add-artifacts', async (req, res) => {
            const body = req.body;
            const result = await allArtifactsCollection.insertOne(body);
            res.json({
                status: true,
                data: result
            })
        })

        // Get all artifacts API 
        app.get('/artifacts', async (req, res) => {
            const result = await allArtifactsCollection.find().toArray();
            res.json({
                status: true,
                data: result
            })
        })

        // Get one artifact API 
        app.get('/artifact/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allArtifactsCollection.findOne(query);
            console.log(id);
            res.json({
                status: true,
                data: result
            })
        })

        // get all highest like artifacts API 
        app.get('/featured-artifacts', async (req, res) => {
            const result = await allArtifactsCollection.find({}).sort({ "likeCount": -1 }).limit(6).toArray();
            res.json({
                status: true,
                data: result
            })
        })

        // get single user added artifacts API 
        app.get('/user-added-artifacts/:email/:name', verifyToken, async (req, res) => {
            const { email, name } = req.params;
            // console.log(email, name);
            const query = { email: email, artifactAddedBy: name };
            const result = await allArtifactsCollection.find(query).toArray();
            res.json({
                status: true,
                data: result
            })
        })


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