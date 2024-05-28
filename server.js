"use strict";
require("dotenv").config({ path: "sample.env" }); // Load environment variables from sample.env
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const { MongoClient, ServerApiVersion } = require("mongodb");
const URI = process.env.MONGO_URI;
const routes = require("./routes.js");
const auth = require("./auth.js");
const session = require("express-session");
const SESSION_SECRET = process.env.SESSION_SECRET;
const passport = require("passport");
const app = express();

const http = require("http").createServer(app);
const io = require("socket.io")(http);

if (!URI) {
  console.error("Missing MONGO_URI in environment variables");
  process.exit(1);
}

if (!SESSION_SECRET) {
  console.error("Missing SESSION_SECRET in environment variables");
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

fccTesting(app); // For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", "./views/pug");

app.use(
  session({
    secret: SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

app.use(passport.initialize());
app.use(passport.session());

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

    let currentUsers = 0;
    io.on("connection", (socket) => {
      ++currentUsers;
      io.emit("user count", currentUsers);
      console.log("A user has connected");
    });
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
