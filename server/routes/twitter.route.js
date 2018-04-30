const express = require("express");
const twitterCtrl = require("../controllers/twitter.controller");
const spreadsheetsCtrl = require("../controllers/spreadsheets.controller");

const router = express.Router(); // eslint-disable-line new-cap

// / listar todas as contas na db
// /compare-all/likes ou outras paradas pra gerar um grafico comparando todos os atores
// /:username
// /:username/likes ou outras para analisar todas as amostras de um dado

// /import-data

router.route("/")
	.get(twitterCtrl.listAccounts);

router.route("/import")
	.get(
		spreadsheetsCtrl.authenticate,
		spreadsheetsCtrl.setResocieSheet,
		spreadsheetsCtrl.listCollectives,
		twitterCtrl.importData,
	);

router.route("/:username")
	.get(twitterCtrl.getUser);

router.route("/latest/:username")
	.get(twitterCtrl.userLastSample);

router.route("/:username/:query")
	.get(twitterCtrl.setSampleKey, twitterCtrl.createDataset, twitterCtrl.drawLineChart);

router.param("username", twitterCtrl.loadAccount);

module.exports = router;
