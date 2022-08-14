require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const axios = require("axios");
const app = express();
const localStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const bcrypt = require("bcrypt");
app.set("view engine", "ejs");
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URL);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new localStrategy(function (username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) return done(err);
      if (!user) return done(null, false, { message: "Incorrect username." });

      bcrypt.compare(password, user.password, function (err, res) {
        if (err) return done(err);
        if (res === false)
          return done(null, false, { message: "Incorrect password." });
        return done(null, user);
      });
    });
  })
);

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

function isLoggedOut(req, res, next) {
  if (!req.isAuthenticated()) return next();
  res.redirect("/");
}

app.use(flash());
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});
app.use(express.static("public"));
let newsData;

app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/login", isLoggedOut, (req, res) => {
  const response = {
    title: "Login",
    error: req.query.error,
  };
  res.render("login", response);
});

app.get("/", isLoggedIn, (req, res) => {
  let allresponses = [];
  let one =
    `https://newsapi.org/v2/top-headlines?q=news&language=en&pageSize=5&apiKey=${process.env.API_KEY}`;
  let two =
    `https://newsapi.org/v2/top-headlines?country=in&pageSize=5&apiKey=${process.env.API_KEY}`;
  let three =
    `https://newsapi.org/v2/top-headlines?category=sports&country=in&pageSize=5&apiKey=${process.env.API_KEY}`;
  let four =
    `https://newsapi.org/v2/everything?q=entertainment&pageSize=5&apiKey=${process.env.API_KEY}`;

  const requestOne = axios.get(one);
  const requestTwo = axios.get(two);
  const requestThree = axios.get(three);
  const requestfour = axios.get(four);
  let finalres = [];
  axios
    .all([requestOne, requestTwo, requestThree, requestfour])
    .then(
      axios.spread((...responses) => {
        const responseOne = responses[0];
        const responseTwo = responses[1];
        const responesThree = responses[2];
        const responesfour = responses[3];
        // use/access the results
        allresponses.push(
          responseOne.data.articles,
          responseTwo.data.articles,
          responesThree.data.articles,
          responesfour.data.articles
        );
        for (let i = 0; i < allresponses.length; i++) {
          for (let j = 0; j < 5; j++) {
            finalres.push(allresponses[i][j]);
          }
        }
        res.render("home", {
          articles: finalres,
        });
      })
    )
    .catch((errors) => {
      console.log(errors);
    });
});
app.get("/sports", (req, res) => {
  let url =
    `https://newsapi.org/v2/top-headlines?category=sports&country=in&pageSize=21&apiKey=${process.env.API_KEY}`;
  axios.get(url).then((response) => {
    let articlearr = response.data.articles;
    res.render("allPost", {
      articles: articlearr,
      ApiUrl: url,
    });
  });
});
app.get("/topHeadlines", (req, res) => {
  let url =
    `https://newsapi.org/v2/top-headlines?country=in&pageSize=21&apiKey=${process.env.API_KEY}`;
  axios.get(url).then((response) => {
    let articlearr = response.data.articles;
    res.render("allPost", {
      articles: articlearr,
      ApiUrl: url,
    });
  });
});
app.get("/news", (req, res) => {
  let url =
    `https://newsapi.org/v2/top-headlines?q=news&pageSize=21&apiKey=${process.env.API_KEY}`;
  axios.get(url).then((response) => {
    let articlearr = response.data.articles;
    res.render("allPost", {
      articles: articlearr,
      ApiUrl: url,
    });
  });
});
app.get("/entertainment", (req, res) => {
  let url =
    `https://newsapi.org/v2/everything?q=entertainment&pageSize=21&apiKey=${process.env.API_KEY}`;
  axios.get(url).then((response) => {
    let articlearr = response.data.articles;
    res.render("allPost", {
      articles: articlearr,
      ApiUrl: url,
    });
  });
});
app.post("/query", (req, res) => {
  let qr = req.body.searchReq;
  let url = `https://newsapi.org/v2/everything?q=${qr}&apiKey=${process.env.API_KEY}`;
  axios.get(url).then((response) => {
    let articlearr = response.data.articles;
    res.render("allPost", {
      articles: articlearr,
      ApiUrl: url,
    });
  });
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  // Check if all the fields are filled
  let errors = [];
  if (!name || !email || !password) {
    errors.push({ msg: "Please fill in all the fields" });
  }
  // Check password length >= 6
  if (password.length < 6) {
    errors.push({ msg: "Password should be at least 6 characters" });
  }

  if (errors.length > 0) {
    res.render("register", {
      errors,
      name,
      email,
      password,
    });
  } else {
    const exists = await User.exists({ username: req.body.email });
    if (exists) {
      errors.push({ msg: "Email already registered" });
      res.render("register", {
        errors,
        name,
        email,
        password,
      });
    }
    else{
      bcrypt.genSalt(10, function (err, salt) {
        if (err) return next(err);
        bcrypt.hash(req.body.password, salt, function (err, hash) {
          if (err) return next(err);
    
          const newAdmin = new User({
            username: req.body.email,
            password: hash,
          });
    
          newAdmin.save();
    
          res.redirect("/login");
        });
      });
    }
  }
});
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login?error=true",
  })
);
app.get("/logout", function (req, res) {
  req.logOut(() => {
    res.redirect("/login");
  });
});
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
