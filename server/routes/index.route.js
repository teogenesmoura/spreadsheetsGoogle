const express = require("express");
const spreadsheetsRoute = require("./spreadsheets.route");
const instagramRoute = require("./instagram.route");
const twitterRoute = require("./twitter.route");
const facebookRoute = require("./facebook.route");

const router = express.Router();

router.use("/", spreadsheetsRoute);

// mount facebook routes at /facebook
router.use("/facebook", facebookRoute);

// mount twitter routes at /twitter
router.use("/twitter", twitterRoute);

router.use("/instagram", instagramRoute);

module.exports = router;
