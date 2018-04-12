const express = require("express");
const spreadsheetsRoute = require("./spreadsheets.route");
const twitterRoute = require("./twitter.route");
const facebookRoute = require("./facebook.route");

const router = express.Router();

// mount spreadsheets routes at /spreadsheets
router.use("/spreadsheets", spreadsheetsRoute);

// mount facebook routes at /facebook
router.use("/facebook", facebookRoute);

// mount twitter routes at /twitter
router.use("/twitter", twitterRoute);

module.exports = router;
