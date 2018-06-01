const express = require("express");
const spreadsheetsCtrl = require("../controllers/spreadsheets.controller");

const router = express.Router(); // eslint-disable-line new-cap

router.route("/")
	.get(spreadsheetsCtrl.showLinkMap);

router.get("/qualquer", (req, res) => {
	res.render("qualquer");
});

module.exports = router;
