const express = require("express");
/* const instagramCtrl = require("../controllers/instagram.controller"); */

const router = express.Router(); // eslint-disable-line new-cap

router.get("/", (req, res) => {
	res.write("Hello insta");
	res.end();
});

module.exports = router;
