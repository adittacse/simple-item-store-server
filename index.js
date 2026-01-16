const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const isValidPrice = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0;
};

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.gkaujxr.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        const db = client.db("simpleItemStore");
        const itemsCollection = db.collection("items");

        // items's related api's
        app.get("/items", async (req, res) => {
            const { search, category, sort = "newest" } = req.query;

            const query = {};

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ];
            }

            if (category) {
                query.category = category;
            }

            let sortQuery = {};
            switch (sort) {
                case "price_low":
                    sortQuery = { price: 1 };
                    break;
                case "price_high":
                    sortQuery = { price: -1 };
                    break;
                case "newest":
                default:
                    sortQuery = { createdAt: -1 };
                    break;
            }

            const cursor = itemsCollection.find(query).sort(sortQuery);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post("/items", async (req, res) => {
            const name = req.body?.name;
            const description = req.body?.description;
            const imageUrl = req.body?.imageUrl;
            const category = req.body?.category;
            const priceRaw = req.body?.price;

            if (!name || !description || !imageUrl || !isValidPrice(priceRaw)) {
                return res.status(400).send({
                    message: "Missing/invalid required fields (name, description, price, imageUrl)",
                });
            }

            const doc = {
                name,
                description,
                imageUrl,
                category: category || "",
                price: Number(priceRaw),
                createdAt: new Date(),
            };

            const result = await itemsCollection.insertOne(doc);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!",
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Book Worm server side is running!");
});

app.listen(port, () => {
    console.log(
        `Book Worm listening on ${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}`,
    );
});