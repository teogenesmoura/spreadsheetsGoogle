
const express = require("express");
const facebookCtrl = require("../controllers/facebook.controller");

const router = express.Router(); // eslint-disable-line new-cap

/**
 * Access to the Facebook data home page. Presentation of a welcome message.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 *
router.get("/", (req, res) => {
	res.write("Welcome to Facebook Main Page");
	res.end();
});
*/
// Search for all records on Facebook.
router.route("/")
	.get(facebookCtrl.listAccounts);

router.param("name", facebookCtrl.loadAccount);

router.route("/:name")
	.get(facebookCtrl.getUser);

router.route("/:name/:query")
	.get(
		facebookCtrl.setHistoryKey,
		facebookCtrl.getDataset,
		facebookCtrl.getChartLimits,
		facebookCtrl.getConfigLineChart,
		facebookCtrl.plotLineChart,
	);

/*
// Inserting all records, redirecting to Facebook main page
router.route("/init")
	.get(facebookCtrl.signUpInit);
*/

module.exports = router;
