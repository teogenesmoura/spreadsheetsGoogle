
const express = require("express");
const facebookCtrl = require("../controllers/facebook.controller");
const spreadsheetsCtrl = require("../controllers/spreadsheets.controller");

const router = express.Router(); // eslint-disable-line new-cap

/**
 * Access to the Facebook data home page.
 * Presentation of all user registered, identified by name.
*/
router.route("/")
	.get(facebookCtrl.listAccounts);

router.route("/help")
	.get(facebookCtrl.help);

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
router.route("/:name")
	.get(facebookCtrl.getUser);

/**
 * Access to the latest valid data of a given user.
 */
router.route("/latest/:name")
	.get(facebookCtrl.getLatest);


/**
 * Presentation of the temporal evolution of a given query for a given user.
 */
router.route("/:name/:query")
	.get(
		facebookCtrl.setHistoryKey,
		facebookCtrl.getDataset,
		facebookCtrl.getChartLimits,
		facebookCtrl.getConfigLineChart,
		facebookCtrl.plotLineChart,
	);

/**
 * Search for a user in the database
 */
router.param("name", facebookCtrl.loadAccount);

module.exports = router;
