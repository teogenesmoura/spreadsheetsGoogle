const express = require("express");
const spreadsheetsRoute = require("./spreadsheets.route");
const instagramRoute = require("./instagram.route");

const router = express.Router();

// mount spreadsheets routes at /spreadsheets
router.use("/spreadsheets", spreadsheetsRoute);

router.use("/instagram", instagramRoute);

module.exports = router;
