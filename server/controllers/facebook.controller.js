// const logger = require("../../config/logger");

/* module.exports = (app) => {
	const facebook = app.server.models.facebook.model;

	const facebookController = {
		index: (req, res) => {
			facebook.find((error, data) => {
				/* if(error){}
				else
				//
				return res.render("facebook/index", { list: data });
			});
		},
	};
	return facebookController;
}; */

// const mongoose = require("mongoose");
const Facebook = require("../models/facebook.model");
const httpStatus = require("http-status");
const ChartNode = require("chartjs-node");

if (global.CanvasGradient === undefined) {
	global.CanvasGradient = () => {};
}

const likesType = "Likes";
const blueDark = "#3b5998";
// const blue = "#8b9dc3";
// const blueSoft = "#dfe3ee";
const blueLight = "#f7f7f7";

/**
 * Search for all registered Facebook accounts.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @return {object} result - list with all registered accounts
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

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

/**
 * Look for a specific registered Facebook account.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @param {object} next - standard next function
 * @param {object} name - standard identifier of a Facebook account
 * @returns Execution of the next feature
 */
const loadAccount = async (req, res, next, name) => {
	try {
		const account = await Facebook.findOne({ name });
		req.account = account;

		return next();
	} catch (error) {
		const errorMsg = `Error loading user: ${name} into database`;

		return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
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
		backgroundColor: blueDark,
		borderColor: blueLight,
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
	listAccounts, loadAccount, likeProgress, signUpInit,
};
