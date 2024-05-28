const passport = require("passport");
const bcrypt = require("bcrypt");

module.exports = function (app, myDataBase) {
  app.route("/").get((req, res) => {
    res.render("index", {
      title: "Connected to Database",
      message: "Please log in",
      showLogin: true,
      showRegistration: true,
    });
  });

  app.route("/register").post(
    (req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) return next(err);
        if (user) return res.redirect("/");

        myDataBase.insertOne(
          {
            username: req.body.username,
            password: hash,
          },
          (err, doc) => {
            if (err) return res.redirect("/");
            next(null, doc.ops[0]);
          }
        );
      });
    },
    passport.authenticate("local", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("/profile");
    }
  );

  app.post(
    "/login",
    passport.authenticate("local", {
      failureRedirect: "/",
      successRedirect: "/profile",
    }),
    (req, res) => {
      console.log("User authenticated:", req.isAuthenticated());
    }
  );

  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    res.render("profile", {
      username: req.user.username,
    });
  });

  app.route("/logout").post((req, res) => {
    try {
      req.logout(() => {
        req.session.destroy(() => {
          res.redirect("/");
        });
      });
    } catch (error) {
      console.error(error);
    }
  });
};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}
