var express = require("express");
var morgan = require("morgan");
var bodyParser = require("body-parser");
var ejs = require("ejs");
var ejsMate = require("ejs-mate");
var session = require("express-session");
var cookieParser = require("cookie-parser");
var flash = require("express-flash");
var mongoStore = require("connect-mongo")(session);
var passport = require("passport");
var mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

var User = require("./models/user");
var Category = require("./models/category");
var Cart = require("./models/cart");
var mainRoutes = require("./routes/main");
var userRoutes = require("./routes/user");
var adminRoutes = require("./routes/admin");
var secret = require("./config/secret");
var apiRoutes = require("./api/api");
var cartLength = require("./middlewares/middlewares");

var app = express();
mongoose
  .connect(secret.database, {
    useMongoClient: true
  })
  .then(
    db => {
      console.log("Connected to the database correctly");
    },
    err => {
      console.log(err);
    }
  );

app.use(express.static(__dirname + "/public"));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secret.secretkey,
  store: new mongoStore({url: secret.database, autoReconnect: true}),

}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use(cartLength);
app.use((req, res, next) => {
  Category.find({}, (err, categories) => {
    if (err) return next(err);
    res.locals.categories = categories;
    next();
  });
});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");

app.use(mainRoutes);
app.use(userRoutes);
app.use(adminRoutes);
app.use("/api", apiRoutes);

app.listen(secret.port, err => {
  if (err) throw err;
  console.log("Server is running on port: " + secret.port);
});
