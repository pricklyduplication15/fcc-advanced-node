"use strict";
require("dotenv").config({ path: "sample.env" }); // Load environment variables from sample.env
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const passport = require("passport");
const bcrypt = require("bcrypt");
const URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!URI) {
  console.error("Missing MONGO_URI in environment variables");
  process.exit(1);
}

if (!SESSION_SECRET) {
  console.error("Missing SESSION_SECRET in environment variables");
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
        message: "Please log in",
        showLogin: true,
        showRegistration: true,
      });
    });

    app.use(
      session({
        secret: SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: { secure: false },
      })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    app.post(
      "/login",
      passport.authenticate("local", {
        failureRedirect: "/",
        successRedirect: "/profile",
      })
    );

    app.route("/profile").get(ensureAuthenticated, (req, res) => {
      res.render("profile", {
        username: req.user.username,
      });
    });

    app.route("/logout").get((req, res) => {
      req.logout();
      res.redirect("/");
    });

    passport.use(
      new LocalStrategy((username, password, done) => {
        myDataBase.findOne({ username: username }, (err, user) => {
          console.log(`User ${username} attempted to log in.`);
          if (err) return done(err);
          if (!user) return done(null, false);
          if (!bcrypt.compareSync(password, user.password))
            return done(null, user);
        });
      })
    );
    passport.serializeUser((user, done) => {
      done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
      myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
        done(null, doc);
      });
    });

    app.route("/register").post(
      (req, res, next) => {
        const hash = bcrypt.hashSync(req.body.password, 12);
        myDataBase.findOne({ username: req.body.username }, (err, user) => {
          if (err) {
            next(err);
          } else if (user) {
            res.redirect("/");
          } else {
            myDataBase.insertOne(
              {
                username: req.body.username,
                password: hash,
              },
              (err, doc) => {
                if (err) {
                  res.redirect("/");
                } else {
                  next(null, doc.ops[0]);
                }
              }
            );
          }
        });
      },
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res, next) => {
        res.redirect("/profile");
      }
    );

    app.use((req, res, next) => {
      res.status(404).type("text").send("Not Found");
    });
  } catch (e) {
    console.error(e);
  }
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

run().catch(console.dir);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
