
const express = require("express");
const facebookCtrl = require("../controllers/facebook.controller");

const router = express.Router(); // eslint-disable-line new-cap

router.route("/")
	.get(facebookCtrl.test);

module.exports = router;
