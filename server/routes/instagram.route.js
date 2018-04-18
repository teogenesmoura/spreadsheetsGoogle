const express = require("express");

const instagramControl = require("../controllers/instagram.controller");

const router = express.Router(); // eslint-disable-line new-cap


router.route("/")
	.get(instagramControl.listAccounts);

router.route("/latest/:name")
	.get(instagramControl.getLatest);

router.get("/:name", instagramControl.getUser);

router.route("/:name/:query")
	.get(
		instagramControl.setHistoryKey,
		instagramControl.getDataset,
		instagramControl.getChartLimits,
		instagramControl.getConfigLineChart,
		instagramControl.plotLineChart,
	);

router.param("name", instagramControl.loadAccount);

module.exports = router;
