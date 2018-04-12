const httpStatus = require("http-status");
const ChartNode = require("chartjs-node");
const Facebook = require("../models/facebook.model");
const logger = require("../../config/logger");

const likesType = "likes";
const followersType = "followers";

const blueTones = ["#3b5998", "#5a7abf", "#8b9dc3", "#6b92e3", "#889eec", "#dfe3ee", "#f7f7f7"];
const colorCtrl = 0;
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
		const accounts = await Facebook.find({}, "link name -_id");

		res.status(httpStatus.OK).json({
			error: false,
			results: accounts,
		});
	} catch (error) {
		const errorMsg = "Error loading Facebook users from database";

		logger.error(errorMsg);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

/**
 * Look for a specific registered Facebook account, by name.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @param {object} name - standard identifier of a Facebook account
 * @returns Execution of the next feature, over the data found
 */
const loadAccount = async (req, res, next, name) => {
	try {
		const account = await Facebook.findOne({ name });
		req.account = account;

		return next();
	} catch (error) {
		const errorMsg = `Error loading user: ${name} into database`;

		logger.error(errorMsg);

		return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
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
	case likesType:
		chartTitle = evolutionMsg("curtidas");
		break;
	case followersType:
		chartTitle = evolutionMsg("seguidores");
		break;
	default:
		logger.error(errorMsg);

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

	const data = [];
	const labels = [];

	const length = history.length;
	for (let ind = 0; ind < length; ind += 1) {
		if (history[ind][historyKey] !== undefined
			&& history[ind][historyKey] !== null) {
			const date = new Date(history[ind].date);

			data.push({
				x: date,
				y: history[ind][historyKey],
			});
			labels.push(date);
		}
	}

	const dataSet = [{
		data: data,
		backgroundColor: blueTones[colorCtrl],
		borderColor: white,
		fill: false,
		label: `${req.account.name} (${req.account.link})`,
	}];

	req.chart.dataSets = dataSet;
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
	const historyValid = req.chart.datasets.data;
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
	minValue = Math.floor(minValue) - desvPadValue;
	maxValue = Math.ceil(maxValue) + desvPadValue;

	req.chart.yMin = minValue;
	req.chart.yMax = maxValue;
	req.chart.yStep = (maxValue - minValue) / (2 * length);

	next();
};

/**
 * Graphic response to the likes evolution of a given account
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const likeProgress = async (req, res) => {
	const history = req.account.history;

	const mainLabel = evolutionMsg("curtidas");

	getProgress(req, history, likesType)
		.then(async (progress) => {
			const chart = await drawLineChart(mainLabel, progress[0], progress[1], progress[2]);
			const buffer = await chart.getImageBuffer("image/png");
			res.writeHead(httpStatus.OK, { "Content-Type": "image/png" });
			res.write(buffer);
			res.end();
		});
};

const getProgress = async (req, history, type) => {
	const length = history.length;

	const data = [];
	const labels = [];
	let minValue = Infinity;
	let maxValue = -Infinity;
	let minTime = Infinity;
	let maxTime = -Infinity;
	let value;
	let date;
	let averageValue = 0;
	let desvPadValue = 0;

	for (let ind = 0; ind < length; ind += 1) {
		date = 0;
		switch (type) {
		case likesType:
			if (history[ind].likes !== undefined
				&& history[ind].likes !== null) {
				date = new Date(history[ind].date);
				value = history[ind].likes;
			}
			break;
		default:
			if (history[ind].followers !== undefined
				&& history[ind].followers !== null) {
				date = new Date(history[ind].date);
				value = history[ind].followers;
			}
		}

		data.push({
			x: date,
			y: value,
		});
		labels.push(date);

		if (value < minValue) minValue = value;
		else if (value > maxValue) maxValue = value;

		if (date.getTime() < minTime) minTime = date.getTime();
		else if (date.getTime() > maxTime) maxTime = date.getTime();

		averageValue += value;
	}

	averageValue /= length;
	for (let ind = 0; ind < length; ind += 1) {
		if (history[ind].likes !== undefined
			&& history[ind].likes !== null) {
			desvPadValue += (history[ind].likes - averageValue) ** 2;
		}
	}
	desvPadValue /= length;
	desvPadValue = Math.ceil(Math.sqrt(desvPadValue));
	minValue = Math.floor(minValue) - desvPadValue;
	maxValue = Math.ceil(maxValue) + desvPadValue;

	const dataSet = [{
		data: data,
		backgroundColor: blueTones[0],
		borderColor: blueTones[blueTones.length - 1],
		fill: false,
		label: `${req.account.name} (${req.account.link})`,
	}];

	const mathCtrl = [minValue, maxValue, data.length];
	const timeCtrl = [minTime, maxTime];

	const returnArray = [];
	returnArray.push(dataSet);
	returnArray.push(mathCtrl);
	returnArray.push(timeCtrl);

	return returnArray;
};

/**
 * Generating a line-type chart
 * @param {String} mainLabel - charRodrigot primary identifier generated
 * @param {object} dataSets - set of chart settings
 * @returns chart generated
 */
const drawLineChart = async (mainLabel, dataSets, mathCtrl, timeCtrl) => {
	const chart = new ChartNode(600, 600);
	const config = {
		type: "line",
		data: {
			datasets: dataSets,
		},
		options: {
			title: {
				display: true,
				text: mainLabel,
			},
			scales: {
				xAxes: [{
					type: "time",
					autoSkip: false,
					time: {
						tooltipFormat: "ll HH:mm",
						unit: "week",
						min: timeCtrl[0],
						max: timeCtrl[1],
						displayFormats: { month: "MMM YYYY" },
					},
					ticks: {
						major: {
							fontStyle: "bold",
						},
					},
					scaleLabel: {
						display: true,
						labelString: "Date",
					},
				}],
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: "value",
					},
					ticks: {
						min: mathCtrl[0],
						max: mathCtrl[1],
						stepSize: (mathCtrl[1] - mathCtrl[0]) / (2 * mathCtrl[2]),
					},
				}],
			},
		},
	};

	await chart.drawChart(config);
	return chart;
};

/**
 * Insert all Facebook accounts available.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const signUpInit = async (req, res) => {
	console.log("Inserção de dados no banco");

	//	Atualização de dados
	Facebook.findOne({ name: "Rodrigo" }, (err, account) => {
		if (err) console.log(`error ${err}`);

		account.name = "Rodrigo F.G.";
		account.save((error) => {
			if (error) console.log(`error ${error}`);
			console.log("success update");
		});
	});

	//	Incremento no histórico temporal
	Facebook.findOne({ name: "Rodrigo F.G." }, (err, account) => {
		if (err) console.log(`error ${err}`);
		const history = { likes: 24, followers: 240, date: Date.now() };
		account.history.push(history);
		account.save((error) => {
			if (error) console.log(`error ${error}`);
			console.log("success update");
		});
	});

	res.redirect("/facebook");
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

module.exports = {
	listAccounts, loadAccount, setHistoryKey, getDataset, getChartLimits, likeProgress, signUpInit,
};
