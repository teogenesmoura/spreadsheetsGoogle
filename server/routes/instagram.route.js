const express = require("express");
const instagramControl = require("../controllers/instagram.controller");
const spreadsheetsCtrl = require("../controllers/spreadsheets.controller");

const router = express.Router(); // eslint-disable-line new-cap


router.route("/")
	.get(instagramControl.listAccounts);

router.route("/import")
	.get(
		spreadsheetsCtrl.authenticate,
		spreadsheetsCtrl.setResocieSheet,
		spreadsheetsCtrl.listCollectives,
		instagramControl.importData,
	);

router.route("/:username")
	.get(instagramControl.getUser);

router.route("/latest/:username")
	.get(instagramControl.getLatest);

router.route("/:username/:query")
	.get(
		instagramControl.setHistoryKey,
		instagramControl.getDataset,
		instagramControl.getConfigLineChart,
		instagramControl.plotLineChart,
	);

router.param("username", instagramControl.loadAccount);

module.exports = router;
