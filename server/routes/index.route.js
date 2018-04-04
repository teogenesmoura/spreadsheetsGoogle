const express = require("express");
const spreadsheetsRoute = require("./spreadsheets.route");

const router = express.Router();

// mount spreadsheets routes at /spreadsheets
router.use("/spreadsheets", spreadsheetsRoute);

module.exports = router;
