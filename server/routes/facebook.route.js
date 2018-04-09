
const express = require("express");
const facebookCtrl = require("../controllers/facebook.controller");

const router = express.Router(); // eslint-disable-line new-cap

router.get("/", (req, res) => {
	res.write("Welcome to Facebook Main Page");
	res.end();
});

router.route("/find")
	.get(facebookCtrl.find);

router.route("/tstInsertion")
	.get(facebookCtrl.tstInsertion);

router.route("/init")
	.get(facebookCtrl.signUpInit);
module.exports = router;
