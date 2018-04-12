const express = require("express");

const instagramControl = require("../controllers/instagram.controller");

const router = express.Router(); // eslint-disable-line new-cap


router.get("/", (req, res) => {
	res.write("Hello insta");
	res.end();
});

router.route("/all")
	.get(instagramControl.listAccounts);

module.exports = router;
