"use strict";
require("dotenv").config({ path: "sample.env" }); // Load environment variables from sample.env
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const { MongoClient, ServerApiVersion } = require("mongodb");
const URI = process.env.MONGO_URI;
const routes = require("./routes.js");
const auth = require("./auth.js");

if (!URI) {
  console.error("Missing MONGO_URI in environment variables");
  process.exit(1);
}

const client = new MongoClient(URI, {
  useUnifiedTopology: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const app = express();

fccTesting(app); // For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", "./views/pug");

async function run() {
  try {
    await client.connect();
    await client.db("sampledb").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    const myDataBase = client.db("sampledb").collection("users");

    auth(app, myDataBase);
    routes(app, myDataBase);
  } catch (e) {
    console.error(e);
    app.use((req, res, next) => {
      res.status(404).type("text").send("Not Found");
    });
  }
}

run().catch(console.dir);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
