
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

// Graphically evaluate the evolution of the likes of a given account
router.route("/:name/likes")
	.get(facebookCtrl.likeProgress);

router.route("/:name/:query")
	.get(facebookCtrl.setHistoryKey, facebookCtrl.getDataset, facebookCtrl.getChartLimits);

router.param("name", facebookCtrl.loadAccount);

/*
// Inserting all records, redirecting to Facebook main page
router.route("/init")
	.get(facebookCtrl.signUpInit);
*/

module.exports = router;
