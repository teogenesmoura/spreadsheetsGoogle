
const express = require("express");
const facebookCtrl = require("../controllers/facebook.controller");

const router = express.Router(); // eslint-disable-line new-cap

router.get("/", (req, res) => {
	res.write("Welcome to Facebook Main Page");
	res.write("\n");
	res.write("Continuando");
	res.redirect("/");
});

router.route("/find")
	.get(facebookCtrl.find);

router.route("/tstInsertion")
	.get(facebookCtrl.tstInsertion);

module.exports = router;
