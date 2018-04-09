const express = require("express");
const spreadsheetsRoute = require("./spreadsheets.route");
const twitterRoute = require("./twitter.route");

const router = express.Router();

// mount spreadsheets routes at /spreadsheets
router.use("/spreadsheets", spreadsheetsRoute);

router.use("/twitter", twitterRoute);

module.exports = router;
