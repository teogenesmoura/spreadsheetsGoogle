/*	Required modules */
const express = require("express");
const facebookCtrl = require("../controllers/facebook.controller");
const spreadsheetsCtrl = require("../controllers/spreadsheets.controller");

/*	Global constants */
const router = express.Router(); // eslint-disable-line new-cap

/**
 * Access to the Facebook data home page.
 * Presentation of all user registered, identified by name.
*/
router.route("/")
	.get(facebookCtrl.listAccounts);

/**
 * Access to the Facebook help page
 */
router.route("/help")
	.get(facebookCtrl.help);
/**
 * Comparison between actors for data on Facebook
 */
router.route("/compare/:query")
	.get(
		facebookCtrl.splitActors,
		facebookCtrl.loadAccount,
		facebookCtrl.getDataset,
		facebookCtrl.getChartLimits,
		facebookCtrl.getConfigLineChart,
		facebookCtrl.plotLineChart,
	);
/**
 *  Inserting all records, redirecting to Facebook main page
 */
router.route("/import")
	.get(
		spreadsheetsCtrl.authenticate,
		spreadsheetsCtrl.setResocieSheet,
		spreadsheetsCtrl.listCollectives,
		facebookCtrl.importAccounts,
	);

/**
 * Access to the data home page of a given user.
 * Presentation of all the data registered.
 */
router.route("/:id")
	.get(facebookCtrl.getUser);

/**
 * Access to the latest valid data of a given user.
 */
router.route("/latest/:id")
	.get(facebookCtrl.getLatest);

/**
 * Presentation of the temporal evolution of a given query for a given user.
 */
router.route("/:id/:query")
	.get(
		facebookCtrl.getDataset,
		facebookCtrl.getChartLimits,
		facebookCtrl.getConfigLineChart,
		facebookCtrl.plotLineChart,
	);

/**
 * Search for a user in the database
 */
router.param("id", facebookCtrl.loadAccount);
/**
 * Sets the requested query
 */
router.param("query", facebookCtrl.setHistoryKey);

module.exports = router;
