const httpStatus = require("http-status");
const youtubeAccount = require("../models/youtube.model");
const ChartNode = require("chartjs-node");
const logger = require("../../config/logger");

/**
 * Search for all YouTube Accounts on the database.
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @return {object} accounts - list all accounts showing the name of valid accounts
 */
const listAccounts = async (req, res) => {
	try {
		const accounts = await youtubeAccount.find({}, "name channelUrl");
		const length = accounts.length;
		for (let i = 0; i < length; i += 1) {
			accounts[i] = accounts[i].toObject();
			accounts[i].links = [];
			const id = accounts[i]._id; // eslint-disable-line
			if (accounts[i].channelUrl) {
				const link = {
					rel: "youtube.account",
					href: `${req.protocol}://${req.get("host")}/youtube/${id}`,
				};
				accounts[i].links.push(link);
			}
		}
		res.status(httpStatus.OK).json({
			error: false,
			results: accounts,
		});
	} catch (error) {
		const msgError = "Erro ao carregar os usuários do YouTube do banco de dados";
		logger.error(msgError);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: msgError,
		});
	}
};

/**
 * Insert YouTube accounts available from spreadsheet to database
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @return {redirect} - redirect for /youtube page if import successful
 */

const importData = async (req, res) => {
	const actors = {};
	const tabs = req.collectives;
	const length = tabs.length;
	const categories = req.sheet.categories;
	const youtubeRange = req.sheet.youtubeRange;
	const nameRow = req.sheet.range.nameRow;
	const dateRow = youtubeRange.dateRow;
	const channelRow = youtubeRange.channelRow;
	const subscribsRow = youtubeRange.subscribsRow;
	const videosRow = youtubeRange.videosRow;
	const viewsRow = youtubeRange.viewsRow;
	let cCategory;
	let lastDate;

	for (let i = 0; i < length; i += 1) {
		const cTab = tabs[i];
		const rowsCount = cTab.length;
		cCategory = 0;

		for (let j = 0; j < rowsCount; j += 1) {
			const cRow = cTab[j];

			// se a row for vazia ou a primeira, continua
			if (j < 1 || !(cRow[nameRow])) {
				continue; // eslint-disable-line no-continue
			}

			// Se estivermos na row que indicao o novo tipo, atualiza
			// a string do tipo atual e continua para a próxima row
			if (cRow[nameRow] === categories[cCategory + 1]) {
				cCategory += 1;
				continue; // eslint-disable-line no-continue
			}
			// Se o canal é válido, cria um novo schema para o canal
			let channel;
			if (isCellValid(cRow[channelRow])) {
				channel = cRow[channelRow];
			} else {
				channel = null;
			}

			// Caso não exista o usuario atual, cria um novo schema para o usuario
			if (actors[cRow[nameRow]] === undefined) {
				const newAccount = youtubeAccount({
					name: cRow[nameRow],
					category: categories[cCategory],
					channelUrl: channel,
				});
				actors[cRow[nameRow]] = newAccount;
			}

			// Se o canal não for null verifica se os inscritos,
			// videos e vizualizações são válidos
			if (channel) {
				for (let k = subscribsRow; k <= viewsRow; k += 1) {
					if (!isCellValid(cRow[k])) {
						cRow[k] = null;
					} else {
						cRow[k] = parseInt(cRow[k].replace(/\.|,/g, ""), 10);
						if (Number.isNaN(cRow[k])) cRow[k] = null;
					}
				}

				// Insere a data no schema e caso ocorra erros insera a ultima data
				let newDate = cRow[dateRow];
				if (newDate) newDate = newDate.split("/");
				if (!(newDate) || newDate.length !== 3) newDate = lastDate;
				lastDate = newDate;

				// Define os schemas e adicioana os dados dos atores
				const newHistory = {
					subscribers: cRow[subscribsRow],
					videos: cRow[videosRow],
					views: cRow[viewsRow],
					date: new Date(`${newDate[1]}/${newDate[0]}/${newDate[2]}`),
				};
				actors[cRow[nameRow]].history.push(newHistory);
			}
		}
	}

	const savePromises = [];
	Object.entries(actors).forEach(([cActor]) => {
		savePromises.push(actors[cActor].save());
	});
	await Promise.all(savePromises);

	return res.redirect("/youtube");
};

/**
 * Look for a specific registered Youtube account, by name.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @param {object} name - standard identifier of a Youtube account
 * @returns Execution of the next feature, over the data found
 */
const loadAccount = async (req, res, next, id) => {
	try {
		const account = await youtubeAccount.findOne({ _id: id }, " -_v");
		req.account = account;
		return next();
	} catch (error) {
		const msgError = `Erro ao carregar o usuário ${id} no banco de dados`;
		logger.error(msgError);

		return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: msgError,
		});
	}
};

const getUser = async (req, res) => {
	try {
		const account = req.account.toObject();
		const id = account._id; // eslint-disable-line
		account.links = [
			{
				rel: "youtube.account.videos",
				href: `${req.protocol}://${req.get("host")}/youtube/${id}/videos`,
			},
			{
				rel: "youtube.account.views",
				href: `${req.protocol}://${req.get("host")}/youtube/${id}/views`,
			},
			{
				rel: "youtube.account.subscribers",
				href: `${req.protocol}://${req.get("host")}/youtube/${id}/subscribers`,
			},
		];

		res.status(httpStatus.OK).json({
			error: false,
			account,
		});
	} catch (error) {
		const msgError = "Erro interno do servidor enquanto buscava a conta";
		logger.error(msgError);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: msgError,
		});
	}
};

/**
 * Layer to query requested identification
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @returns Execution of the next feature, over the history key generated
 */
const setHistoryKey = async (req, res, next) => {
	const historyKey = req.params.query;

	// Título do gráfico gerado
	let mainLabel;
	const msgError = `Não existe a caracteristica ${historyKey} para o YouTube`;

	// Analisa o caminho da rota que chegou nesta função para
	// ter um título com o parâmetro correto.
	switch (historyKey) {
	case "subscribers":
		mainLabel = "Evolução do número de curtidas";
		break;
	case "videos":
		mainLabel = "Evolução do número de seguidores";
		break;
	case "views":
		mainLabel = "Evolução do número de usuários que segue";
		break;
	default:
		logger.error(msgError);

		return res.status(httpStatus.NOT_FOUND).json({
			error: true,
			description: msgError,
		});
	}

	req.chart = {
		historyKey: historyKey,
		mainLabel: mainLabel,
	};
	return next();
};

/**
 * Recovery of the requested historical data set
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @returns Execution of the next feature, over the data set generated
 */
const getDataset = async (req, res, next) => {
	// Carrega as samples da conta do usuário
	const history = req.account.history;
	const historyKey = req.chart.historyKey;

	const data = [];

	// Itera sobre todas as samples e adiciona aquelas que tem o dado procurado
	// na array de dados `data`
	const length = history.length;
	for (let i = 0; i < length; i += 1) {
		const value = history[i][historyKey];

		if (value !== undefined && value !== null) {
			const date = new Date(history[i].date);
			data.push({
				x: date,
				y: value,
			});
		}
	}

	const dataset = [{
		data: data,
		backgroundColor: "#000000",
		borderColor: "#e62117",
		fill: false,
		label: `${req.account.name} (${req.account.channelUrl})`,
	}];

	req.chart.datasets = dataset;
	next();
};

/**
 * Standard setting for generating a line chart
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @returns Execution of the next feature, over the chart's configuration
 */
const drawLineChart = async (req, res) => {
	const mainLabel = req.chart.mainLabel;
	const datasets = req.chart.datasets;
	const historyKey = req.chart.historyKey;
	const chartNode = new ChartNode(600, 600);
	const config = {
		type: "line",
		data: {
			datasets: datasets,
		},
		options: {
			title: {
				display: true,
				text: mainLabel,
			},
			scales: {
				xAxes: [{
					type: "time",
					time: {
						tooltipFormat: "ll HH:mm",
					},
					ticks: {
						major: {
							fontStyle: "bold",
						},
					},
					scaleLabel: {
						display: true,
						labelString: "Data",
					},
				}],
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: `Nº de ${historyKey}`,
					},
				}],
			},
		},
	};

	await chartNode.drawChart(config);
	const buffer = await chartNode.getImageBuffer("image/png");
	res.writeHead(httpStatus.OK, { "Content-Type": "image/png" });
	res.write(buffer);
	res.end();
};

/**
 * Data validation by recurrent criteria
 * @param {String} value - data to be validated
 * @returns true if it is not valid, false if it is valid
 */
const isCellValid = (value) => {
	if (!(value) || value === "-" || value === "s" || value === "s/" || value === "S" || value === "S/") {
		return false;
	}

	return true;
};

module.exports = {
	listAccounts,
	loadAccount,
	getUser,
	setHistoryKey,
	getDataset,
	drawLineChart,
	importData,

};
