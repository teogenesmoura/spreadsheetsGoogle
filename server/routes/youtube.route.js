const express = require("express");
const youtubeCtrl = require("../controllers/youtube.controller");
const spreadsheetsCtrl = require("../controllers/spreadsheets.controller");

const router = express.Router(); // eslint-disable-line new-cap

// Lista todas as contas de user youtube
router.route("/")
	.get(youtubeCtrl.listAccounts);

// Importa os dados da tabela para o banco de dados
router.route("/import")
	.get(spreadsheetsCtrl.authenticate, 
		spreadsheetsCtrl.setResocieSheet, 
		spreadsheetsCtrl.listCollectives, 
		youtubeCtrl.importData);

// Lista os dados de um usuario especifico
router.route("/:name")
	.get(youtubeCtrl.getUser);

// Mostra o gráfico de um atributo especifico de um usuario Ex. /youtube/Joao/videos
router.route("/:name/:query")
	.get(youtubeCtrl.getDataset, youtubeCtrl.drawLineChart);

// Lista um usuario do banco de dados
router.param("name", youtubeCtrl.loadAccount);

router.param("query", youtubeCtrl.setHistoryKey);

module.exports = router;
