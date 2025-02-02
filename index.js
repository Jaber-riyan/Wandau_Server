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
    // console.log("Inside the verify token");
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
        // All Artifacts Collection
        const allArtifactsCollection = database.collection('Artifacts');
        // Artifacts Like Collection 
        const artifactsLikeCollection = database.collection('ArtifactsLike');

        // JWT token create and remove APIS 
        // JWT token create API 
        app.post('/jwt/create', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });
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

        // get related jobs by search API 
        app.get('/artifacts-search', async (req, res) => {
            // console.log(req.query?.search);
            const searchValue = req.query?.search;
            if (!searchValue) {
                return res.json({
                    message: "No search value provided"
                })
            }
            const query = {
                artifactName : {
                    $regex: searchValue, $options: "i"
                }
            };
            const result = await allArtifactsCollection.find(query).toArray();
            res.json({
                status: true,
                data: result,
                query
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
            // console.log(id);
            res.json({
                status: true,
                data: result
            })
        })

        // update one artifact API 
        app.patch('/artifact-update/:id', async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    artifactName: body?.artifactName,
                    artifactImage: body?.artifactImage,
                    artifactType: body?.artifactType,
                    historicalContext: body?.historicalContext,
                    createdAt: body?.createdAt,
                    discoveredAt: body?.discoveredAt,
                    discoveredBy: body?.discoveredBy,
                    presentLocation: body?.presentLocation
                }
            }
            const result = await allArtifactsCollection.updateOne(query, updatedDoc);
            res.json({
                status: true,
                id,
                body
            })
        })

        // one artifact and artifact related like object delete API 
        app.delete('/artifact-delete/:id', async (req, res) => {
            const id = req.params.id;
            const query1 = { _id: new ObjectId(id) };
            const resultFromArtifactsCollection = await allArtifactsCollection.deleteOne(query1);
            const query2 = { likeArtifact: id };
            const resultFromArtifactsLikeCollection = await artifactsLikeCollection.deleteMany(query2);
            res.json({
                status: true,
                resultFromArtifactsCollection,
                resultFromArtifactsLikeCollection
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
        app.get('/user-added-artifacts/:email', verifyToken, async (req, res) => {
            const { email } = req.params;
            // console.log(email, name);
            // console.log(req.cookies, req.user.email, email);
            if (req.user.email !== req.params.email) {
                return res.status(403).json({ message: "Forbidden Access" });
            }
            const query = { email: email };
            const result = await allArtifactsCollection.find(query).toArray();
            res.json({
                status: true,
                data: result
            })
        })

        // Like Related APIS 
        // the particular artifact user like details save in database API 
        app.post('/like/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const { email } = req.query;
            const body = req.body;
            if (req.user.email !== email) {
                return res.status(401).json({ message: "Forbidden Access" });
            }
            const exist = await artifactsLikeCollection.findOne({ likeArtifact: id, user: email });
            if (exist) {
                return res.json({
                    status: false,
                    message: "Already Liked This Artifact"
                })
            }
            const result = await artifactsLikeCollection.insertOne(body);
            res.json({
                status: true,
                result
            })
        })

        // increase 1 on artifact API 
        app.patch('/like/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const doc = {
                $inc: {
                    likeCount: 1,
                }
            }
            const result = await allArtifactsCollection.updateOne(query, doc);
            res.json({
                status: true,
                result
            })
        })

        // get the liked artifacts for an user 
        app.get('/liked-artifacts/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (req.user.email !== email) {
                return res.status(401).json({ message: "Forbidden Access" });
            }
            const result = await artifactsLikeCollection.find({ user: email }).toArray();
            res.json({
                status: true,
                data: result
            })
        })

        // get the all persons who liked artifacts API 
        app.get('/liked-persons/:id', async (req, res) => {
            const id = req.params.id;
            const query = { likeArtifact: id };
            const result = await artifactsLikeCollection.find(query).toArray();
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