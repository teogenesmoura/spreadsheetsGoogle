const express = require("express");
const spreadsheetsCtrl = require("../controllers/spreadsheets.controller");
const facebookCtrl = require("../controllers/facebook.controller");

const router = express.Router(); // eslint-disable-line new-cap

router.route("/")
	.get(
		spreadsheetsCtrl.authenticate,
		facebookCtrl.setCollectivesParams,
		spreadsheetsCtrl.listCollectives,
		spreadsheetsCtrl.generateCharts,
	);

module.exports = router;
