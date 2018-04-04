const express = require("express");
const spreadsheetsCtrl = require("../controllers/spreadsheets.controller");

const router = express.Router(); // eslint-disable-line new-cap

router.route("/")
	.get(spreadsheetsCtrl.authenticate);

module.exports = router;
