const httpStatus = require("http-status");
const ChartNode = require("chartjs-node");
const Facebook = require("../models/facebook.model");
const logger = require("../../config/logger");
const ResocieSheets = require("../../config/resocie.json").spreadsheets[0];

const chartSize = 600;

const blueTones = ["#3b5998", "#5a7abf", "#8b9dc3", "#6b92e3", "#889eec"]; // , "#dfe3ee", "#f7f7f7"
let colorCtrl = 0;
const white = "#ffffff";

/**
 * Search for all registered Facebook accounts.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @return {object} result - list with all registered accounts, displaying the link and the name
 * @return {String} description - error warning
 */
const listAccounts = async (req, res) => {
	try {
		const accounts = await Facebook.find({}, "name link");
		const length = accounts.length;
		for (let i = 0; i < length; i += 1) {
			accounts[i] = accounts[i].toObject();
			accounts[i].links = [];
			const id = accounts[i]._id; // eslint-disable-line
			if (accounts[i].link) {
				const link = {
					rel: "facebook.account",
					href: `${req.protocol}://${req.get("host")}/facebook/${id}`,
				};
				accounts[i].links.push(link);
			}
		}
		res.status(httpStatus.OK).json({
			error: false,
			results: accounts,
		});
	} catch (error) {
		const errorMsg = "Error loading Facebook users from database";

		logger.error(`${errorMsg} - Details: ${error}`);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

/**
 * Route Guide Page
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const help = async (req, res) => {
	const routes = [{
		root: "/ - Lista com todos os usuários registrados no banco de dados;",
		help: "/help - Exibição desta lista guia das rotas;",
		import: "/import - Aquisição dos dados, referente ao Facebook, armazenados nas planilhas do Google;",
		user: "/:name - Exibição de todos os dados registrados sobre um dado usuário;",
		latest: "/latest/:name - Exibição do último histórico válido para um dado usuário;",
		likes: "/:name/likes - Exibição da evolução de curtidas para um dado usuário;",
		followers: "/:name/followers - Exibição da evolução de seguidores para um dado usuários.",
	}];

	res.status(httpStatus.OK).json({
		error: false,
		results: routes,
	});
};

/**
 * Look for a specific registered Facebook account, by name.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @param {object} name - standard identifier of a Facebook account
 * @returns Execution of the next feature, over the data found
 */
const loadAccount = async (req, res, next, id) => {
	try {
		const account = await Facebook.findOne({ _id: id }, "	");

		req.account = account;

		return next();
	} catch (error) {
		let errorMsg = `Error loading user ${id} from database`;
		errorMsg = `${errorMsg} - Details: ${error}`;

		logger.error(errorMsg);

		return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

/**
 * Data recovery about a given user
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const getUser = async (req, res) => {
	try {
		const account = req.account;
		const id = account._id; // eslint-disable-line
		account.links = [];
		const likesLink = {
			rel: "facebook.account.likes",
			href: `${req.protocol}://${req.get("host")}/facebook/${id}/likes`,
		};
		account.links.push(likesLink);
		const followersLink = {
			rel: "facebook.account.followers",
			href: `${req.protocol}://${req.get("host")}/facebook/${id}/followers`,
		};
		account.links.push(followersLink);

		res.status(httpStatus.OK).json({
			error: false,
			links: account.links,
			results: account,
		});
	} catch (error) {
		const errorMsg = "Internal server error while respondign with account";

		logger.error(`${errorMsg} - Details: ${error}`);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

/**
 * Data recovery latest about a given user
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const getLatest = async (req, res) => {
	try {
		const history = req.account.toObject().history;
		const length = history.length - 1;
		const latest = {};
		let count = 0;

		for (let ind = length; ind >= 0 && count <= 2; ind -= 1) {
			if (latest.likes === undefined
				&& history[ind].likes !== undefined) {
				latest.likes = history[ind].likes;
				count += 1;
			}
			if (latest.followers === undefined
				&& history[ind].followers !== undefined) {
				latest.followers = history[ind].followers;
				count += 1;
			}
		}

		req.account.history.latest = latest;

		res.status(httpStatus.OK).json({
			error: false,
			results: latest,
		});
	} catch (error) {
		const errorMsg = `Error while getting samples of Facebook user ${req.account.name}`;

		logger.error(`${errorMsg} - Details: ${error}`);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
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
	const errorMsg = `Requisição inválida para o usuário ${req.account.name}`;

	let chartTitle;

	switch (historyKey) {
	case ResocieSheets.types[0].likesType:
		chartTitle = evolutionMsg("curtidas");
		break;
	case ResocieSheets.types[0].followersType:
		chartTitle = evolutionMsg("seguidores");
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
		chartTitle: chartTitle,
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
	const history = req.account.history;
	const historyKey = req.chart.historyKey;

	const dataUser = [];
	// const labels = [];

	const length = history.length;
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

	const dataSet = [{
		data: dataUser,
		backgroundColor: white,
		borderColor: blueTones[colorCtrl += 1],
		fill: false,
		label: `${req.account.name} (${req.account.link})`,
	}];

	colorCtrl %= (blueTones.length - 1);

	req.chart.dataSets = dataSet;
	req.chart.data = dataUser;

	next();
};

/**
 * Definition of the mathematical configurations for the Y-axis of the chart
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @returns Execution of the next feature, over the Y-axis limits of the chart
 */
const getChartLimits = async (req, res, next) => {
	const historyValid = req.chart.data;
	const length = historyValid.length;

	let minValue = Infinity;
	let maxValue = -Infinity;
	let averageValue = 0;
	let desvPadValue = 0;
	let value = 0;

	for (let ind = 0; ind < length; ind += 1) {
		value = historyValid[ind].y;

		if (value < minValue) {
			minValue = value;
		} else if (value > maxValue) {
			maxValue = value;
		}

		averageValue += value;
	}

	averageValue /= length;

	for (let ind = 0; ind < length; ind += 1) {
		value = historyValid[ind].y;

		desvPadValue += (value - averageValue) ** 2;
	}

	desvPadValue /= length;
	desvPadValue = Math.ceil(Math.sqrt(desvPadValue));
	maxValue = Math.ceil(maxValue) + desvPadValue;

	minValue = Math.floor(minValue) - desvPadValue;
	if (minValue <= 0) minValue = 0;

	req.chart.yMin = minValue;
	req.chart.yMax = maxValue;
	req.chart.yStep = (maxValue - minValue) / (2 * length);

	next();
};

/**
 * Standard setting for generating a line chart
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @returns Execution of the next feature, over the chart's configuration
 */
const getConfigLineChart = async (req, res, next) => {
	const labelXAxes = "Data";
	const labelYAxes = "Valor";

	const config = {
		type: "line",
		data: { datasets: req.chart.dataSets },
		options: {
			title: {
				display: true,
				text: req.chart.chartTitle,
			},
			scales: {
				xAxes: [{
					type: "time",
					autoSkip: false,
					time: {
						tooltipFormat: "ll HH:mm",
						unit: "week",
						displayFormats: { month: "MMM YYYY" },
					},
					ticks: {
						major: { fontStyle: "bold" },
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
					ticks: {
						min: req.chart.yMin,
						max: req.chart.yMax,
						stepSize: req.chart.yStep,
					},
				}],
			},
		},
	};

	req.chart.config = config;

	next();
};

/**
 * Generating and plotting the generated chart on the page
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const plotLineChart = async (req, res) => {
	const chart = new ChartNode(chartSize, chartSize);

	await chart.drawChart(req.chart.config);
	const buffer = await chart.getImageBuffer("image/png");
	res.writeHeader(httpStatus.OK, { "Content-type": "image/png" });
	res.write(buffer);
	res.end();
};

/**
 * Insert all Facebook accounts available.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const importAccounts = async (req, res) => {
	const tabs = req.collectives;
	const length = tabs.length;
	const actors = {};
	const categories = req.sheet.categories;
	const facebookRange = req.sheet.facebookRange;
	const nameCol = req.sheet.range.nameRow;
	const linkCol = facebookRange.linkCol;
	const likesCol = facebookRange.likesCol;
	const followersCol = facebookRange.followersCol;
	const dateCol = facebookRange.dateCol;
	let cCategory = 0;
	let lastDate;

	for (let posSheet = 0; posSheet < length; posSheet += 1) {
		const cSheet = tabs[posSheet];
		const rowsCount = cSheet.length;
		cCategory = 0;

		for (let posRow = 0; posRow < rowsCount; posRow += 1) {
			const cRow = cSheet[posRow];
			// Se estivermos na row que indicao o novo tipo, atualiza
			// a string do tipo atual e continua para a próxima row
			if (cRow[nameCol] === categories[cCategory + 1]) {
				cCategory += 1;
				continue; // eslint-disable-line no-continue
			}

			// se o nome for vazio ou o primeiro, pular
			if (!cRow[nameCol] || posRow < 1) {
				continue; // eslint-disable-line no-continue
			}

			// se não existe link para conta do facebook
			let accountLink;
			if (isCellValid(cRow[linkCol])) {
				accountLink = cRow[linkCol];
			} else {
				accountLink = null;
			}

			if (actors[cRow[nameCol]] === undefined) {
				const newAccount = Facebook({
					name: cRow[nameCol],
					class: categories[cCategory],
					link: accountLink,
				});

				if (accountLink != null) {
					const splitAccLink = accountLink.split("/");
					newAccount.username = splitAccLink[splitAccLink.length - 2];
				}

				actors[cRow[nameCol]] = newAccount;
			}

			if (accountLink) {
				for (let posRow2 = linkCol; posRow2 <= dateCol; posRow2 += 1) {
					if (!isCellValid(cRow[posRow2])) {
						cRow[posRow2] = null;
					} else if (posRow2 === likesCol	|| posRow2 === followersCol) {
						cRow[posRow2] = parseInt(cRow[posRow2].replace(/\.|,/g, ""), 10);

						if (Number.isNaN(cRow[posRow2])) cRow[posRow2] = null;
					}
				}

				let newDate = cRow[dateCol];
				if (newDate) newDate = newDate.split("/");

				if (!(newDate) || newDate.length !== 3) newDate = lastDate;
				lastDate = newDate;

				const newHistory = {
					likes: cRow[likesCol],
					followers: cRow[followersCol],
					date: new Date(`${newDate[1]}/${newDate[0]}/${newDate[2]}`),
				};

				actors[cRow[nameCol]].history.push(newHistory);
			}
		}
	}
	const savePromises = [];
	Object.entries(actors).forEach((cActor) => {
		savePromises.push(cActor[1].save());
	});

	await Promise.all(savePromises);
	return res.redirect("/facebook");
};

/**
 * Standard message for the analysis of the evolution of a characteristic
 * of a given account
 * @param {String} param - characteristic under analysis
 * @returns standard message generated
 */
const evolutionMsg = (param) => {
	return `Evolução de ${param}`;
};

/**
 * Data validation by recurrent criteria
 * @param {String} value - data to be validated
 * @returns true if it is not valid, false if it is valid
 */
const isCellValid = (value) => {
	if (!(value) || value === "-" || value === "s" || value === "s/") {
		return false;
	}

	return true;
};

module.exports = {
	listAccounts,
	help,
	loadAccount,
	getUser,
	getLatest,
	setHistoryKey,
	getDataset,
	getChartLimits,
	getConfigLineChart,
	plotLineChart,
	importAccounts,
};
