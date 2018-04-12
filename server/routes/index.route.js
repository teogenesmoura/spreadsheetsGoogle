const express = require("express");
const spreadsheetsRoute = require("./spreadsheets.route");
const facebookRoute = require("./facebook.route");

const router = express.Router();

// mount spreadsheets routes at /spreadsheets
router.use("/spreadsheets", spreadsheetsRoute);
// mount facebook routes at /facebook
router.use("/facebook", facebookRoute);

module.exports = router;
