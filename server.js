"use strict";
require("dotenv").config({ path: "sample.env" }); // Load environment variables from sample.env
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const URI = process.env.MONGO_URI;

if (!URI) {
  console.error("Missing MONGO_URI in environment variables");
  process.exit(1);
}

const client = new MongoClient(URI, {
  useUnifiedTopology: true, // Add this option
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const app = express();
const session = require("express-session");
const passport = require("passport");

fccTesting(app); // For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", "./views/pug");

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("sampledb").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Initialize the database and session management after connection
    const myDataBase = client.db("sampledb").collection("users");

    app.route("/").get((req, res) => {
      res.render("index", {
        title: "Connected to Database",
        message: "Please login",
      });
    });

    app.use(
      session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: { secure: false },
      })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => {
      done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
      myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
        if (err) {
          return done(err);
        }
        done(null, doc);
      });
    });
  } catch (e) {
    console.error(e);
    app.route("/").get((req, res) => {
      res.render("index", {
        title: "Error",
        message: "Unable to connect to database",
      });
    });
  }
}

run().catch(console.dir);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
