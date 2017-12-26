var router = require("express").Router();
var stripe = require("stripe")("sk_test_ebQvywKMYNE8qFOw7dwQGwL4");
var async = require("async");

var Product = require("../models/product");
var User = require("../models/user");
var Cart = require("../models/cart");

function paginate(req, res, next) {
  var perPage = 9;
  var page = req.params.page;

  Product.find()
    .skip(perPage * page) // 9 * page(n = 1, 2, 3, 4, ....)
    .limit(perPage)
    .populate("category")
    .exec((err, products) => {
      Product.count((err, count) => {
        if (err) return next(err);
        res.render("main/product-main", {
          products: products,
          pages: count / perPage
        });
      });
    });
}

Product.createMapping((err, mapping) => {
  if (err) {
    console.log("error creating mapping");
    console.log(err);
  } else {
    console.log("Mapping created");
    console.log(mapping);
  }
});

var stream = Product.synchronize();
var count = 0;

stream.on("data", () => {
  count++;
});
stream.on("close", () => {
  console.log("Indexed " + count + " documents");
});
stream.on("error", err => {
  console.log(err);
});

router.post("/product/:product_id", (req, res, next) => {
  Cart.findOne({ owner: req.user._id }, (err, cart) => {
    cart.items.push({
      item: req.body.product_id,
      price: parseFloat(req.body.priceValue),
      quantity: parseInt(req.body.quantity)
    });
    cart.total = (cart.total + parseFloat(req.body.priceValue)).toFixed(2);

    cart.save(err => {
      if (err) return next(err);
      return res.redirect("/cart");
    });
  });
});

router.post("/remove", (req, res, next) => {
  Cart.findOne({ owner: req.user._id }, (err, foundCart) => {
    foundCart.items.pull(String(req.body.item));
    foundCart.total = (foundCart.total - parseFloat(req.body.price)).toFixed(2);
    foundCart.save((err, found) => {
      if (err) return next(err);
      req.flash("remove", "Successfully Removed");
      res.redirect("/cart");
    });
  });
});

router.post("/search", (req, res, next) => {
  res.redirect("/search?=" + req.body.q);
  console.log(req.body);
});

router.get("/search", (req, res, next) => {
  if (req.query.q) {
    Product.search(
      {
        query_string: { query: req.query.q }
      },
      (err, results) => {
        if (err) return next(err);
        var data = result.hits.hits.map(hit => {
          return hit;
        });
        res.render("main/search-result", {
          query: req.query.q,
          data: data
        });
        console.log(data);
      }
    );
  }
});

router.get("/", (req, res, next) => {
  if (req.user) {
    paginate(req, res, next);
  } else {
    res.render("main/home");
  }
});

router.get("/page/:page", (req, res, next) => {
  paginate(req, res, next);
});

router.get("/about", (req, res, next) => {
  res.render("main/about");
});

router.get("/products/:id", (req, res, next) => {
  Product.find({ category: req.params.id })
    .populate("category")
    .exec((err, products) => {
      if (err) return next(err);
      res.render("main/category", { products: products });
    });
});

router.get("/product/:id", (req, res, next) => {
  Product.findById({ _id: req.params.id }, (err, product) => {
    if (err) return next(err);
    res.render("main/product", { product: product });
  });
});

router.get("/cart", (req, res, next) => {
  Cart.findOne({ owner: req.user._id })
    .populate("items.item")
    .exec((err, foundCart) => {
      if (err) return next(err);
      res.render("main/cart", {
        foundCart: foundCart,
        message: req.flash("remove")
      });
    });
});

router.post("/payment", (req, res, next) => {
  var stripeToken = req.body.stripeToken;
  var currentCharges = Math.round(req.body.stripeMoney * 100);
  var charge = stripe.charges.create({
    amount: currentCharges,
    currency: "usd",
    source: stripeToken
  }, (err, charge) => {
    if (err) {
      console.log("Your Card was declined");
    }
  }).then((charge) => {
    async.waterfall([
      (callback) => {
        Cart.findOne({owner: req.user._id}, (err, cart) => {
          callback(err, cart);
        });
      },
      (cart, callback) => {
        User.findOne({_id: req.user._id}, (err, user) => {
          if (user) {
            for (var i = 0; i < cart.items.length; i++) {
              user.history.push({
                item: cart.items[i].item,
                paid: cart.items[i].price
              });
            }
            user.save((err, user) => {
              if (err) return next(err);
              callback(err, user);
            });
          }
        });
      },
      (user) => {
        Cart.update({owner: user._id}, {$set: {items: [], total: 0}}, (err, updated) => {
          if (updated) {
            res.redirect("/profile");
          }
        });
      }
    ]);
  });
});

module.exports = router;
