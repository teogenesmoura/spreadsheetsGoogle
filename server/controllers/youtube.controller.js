const httpStatus = require("http-status");
const youtubeAccount = require("../models/youtube.model");
const ChartNode = require("chartjs-node");
const logger = require("../../config/logger");
const ResocieSheets = require("../../config/resocie.json").spreadsheets[0];

const MAX_LEN_LABEL = 80;

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
			accounts,
		});
	} catch (error) {
		const errorMsg = "Erro ao carregar usuários do Youtube nos registros";

		stdErrorHand(res, errorMsg, error);
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
					name: cRow[nameRow].replace(/\n/g, " "),
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
 * @returns Execution of the next feature, over the data found
 */
const loadAccount = async (req, res, next) => {
	try {
		if (req.actors !== undefined) {
			for (const cActor of req.actors) {	// eslint-disable-line
				await findAccount(req, cActor);	// eslint-disable-line
			} 									// eslint-disable-line
		} else {
			const id = await req.params.id;
			await findAccount(req, id);
		}

		return next();
	} catch (error) {
		let id;
		if (req.actors !== undefined) {
			id = await req.actors;
		} else {
			id = await req.params.id;
		}
		const errorMsg = `Error ao carregar usuário ${id} dos registros do YouTube`;

		return stdErrorHand(res, errorMsg, error);
	}
};

const getUser = async (req, res) => {
	try {
		const account = req.account[0].toObject();
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
		const errorMsg = "Erro enquanto configura-se o usuário";

		stdErrorHand(res, errorMsg, error);
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
	const errorMsg = `Não existe a caracteristica ${historyKey} para o YouTube`;

	// Analisa o caminho da rota que chegou nesta função para
	// ter um título com o parâmetro correto.
	switch (historyKey) {
	case ResocieSheets.types.subscribersType:
		mainLabel = evolutionMsg("curtidas");
		break;
	case ResocieSheets.types.videosType:
		mainLabel = evolutionMsg("seguidores");
		break;
	case ResocieSheets.types.viewsType:
		mainLabel = evolutionMsg("visualizações");
		break;
	default:
		logger.error(`${errorMsg} - Tried to access ${req.originalUrl}`);

		return res.status(httpStatus.NOT_FOUND).json({
			error: true,
			description: errorMsg,
		});
	}

	req.chart = {
		historyKey: historyKey,
		mainLabel: mainLabel,
	};
	return next();
};

/**
 * Split of actors to be compared
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 */
const splitActors = async (req, res, next) => {
	try {
		const actors = req.query.actors.split(",");

		req.actors = actors;

		next();
	} catch (error) {
		const errorMsg = "Erro ao criar o ambiente para a comparação";

		stdErrorHand(res, errorMsg, error);
	}
};

/**
 * Recovery of the requested historical data set
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @returns Execution of the next feature, over the data set generated
 */
const getDataset = async (req, res, next) => {
	const historyKey = req.chart.historyKey;
	const accounts = req.account;

	if (req.chart.dataSets === undefined) {
		req.chart.dataSets = [];
	}

	/*
	if (req.chart.data === undefined) {
		req.chart.data = [];
	}
	// */

	accounts.forEach(async (account) => {
		const dataUser = [];
		const history = account.history;
		const length = history.length;
		// const labels = [];

		for (let ind = 0; ind < length; ind += 1) {
			if (history[ind][historyKey] !== undefined
				&& history[ind][historyKey] !== null) {
				const date = new Date(history[ind].date);

				dataUser.push({
					x: date,
					y: history[ind][historyKey],
				});
				// labels.push(date);
			}
		}

		let label;
		if ((account.name.length + account.channelUrl.length) > MAX_LEN_LABEL) {
			label = `${account.name}\n(${account.channelUrl})`;
		} else {
			label = `${account.name} (${account.channelUrl})`;
		}

		const dataSet = {
			data: dataUser,
			backgroundColor: "#000000",
			borderColor: "#e62117",
			fill: false,
			label: label,
		};

		req.chart.dataSets.push(dataSet);
		// req.chart.data.push(dataUser);
	});

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
	const datasets = req.chart.dataSets;
	const historyKey = req.chart.historyKey;
	const chartNode = new ChartNode(600, 600);
	const labelXAxes = "Data";
	const labelYAxes = `Nº de ${historyKey}`;

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
			legend: {
				display: true,
				position: "top",
				labels: {
					padding: 15,
				},
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
						labelString: labelXAxes,
					},
				}],
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: labelYAxes,
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
 * Search for an account in the records and making it available
 * @param {object} req - standard request object from the Express library
 * @param {object} id - standard identifier of a YouTune account
 */
const findAccount = async (req, id) => {
	const account = await youtubeAccount.findOne({ _id: id }, " -_v");

	if (req.account === undefined) req.account = await [];

	await req.account.push(account);
};

/**
 * Standard Error Handling
 * @param {object} res - standard response object from the Express library
 * @param {String} errorMsg - error message for the situation
 * @param {object} error - error that actually happened
 */
const stdErrorHand = async (res, errorMsg, error) => {
	logger.error(`${errorMsg} - Detalhes: ${error}`);

	res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
		error: true,
		description: errorMsg,
	});
};

/**
 * Standard message for the analysis of the evolution of a characteristic
 * of a given account
 * @param {String} param - characteristic under analysis
 * @returns standard message generated
 */
const evolutionMsg = (param) => {
	return `Evolução de ${param}, no YouTube`;
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
	splitActors,
	getDataset,
	drawLineChart,
	importData,
};
