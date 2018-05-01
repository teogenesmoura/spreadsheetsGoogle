const httpStatus = require("http-status");
const mongoose = require("mongoose");
const ChartNode = require("chartjs-node");
const instagramAccount = require("../models/instagram.model");
const logger = require("../../config/logger");
const color = require("./color.controller");
const ResocieSheets = require("../../config/resocie.json").spreadsheets;

const chartSize = 700;
const MAX_LEN_LABEL = 80;

/**
 * Search for all registered Facebook accounts.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 * @return {object} result - list with all registered accounts, displaying the link and the name
 * @return {String} description - error warning
 */
const listAccounts = async (req, res) => {
	try {
		const accounts = await instagramAccount.find({}, "name username");
		const length = accounts.length;
		const importLink = {
			rel: "instagram.import",
			href: `${req.protocol}://${req.get("host")}/instagram/import`,
		};
		for (let i = 0; i < length; i += 1) {
			accounts[i] = accounts[i].toObject();
			accounts[i].links = [];
			if (accounts[i].username) {
				const link = {
					rel: "instagram.account",
					href: `${req.protocol}://${req.get("host")}/instagram/${accounts[i].username}`,
				};
				accounts[i].links.push(link);
			}
		}
		res.status(httpStatus.OK).json({
			error: false,
			import: importLink,
			accounts,
		});
	} catch (error) {
		const errorMsg = "Erro ao carregar usuários do Instagram nos registros";

		stdErrorHand(res, errorMsg, error);
	}
};

const matchInstagramUsername = (profileUrl) => {
	try {
		if (!(profileUrl) || !(profileUrl.includes("instagram.com"))) return null;
		const igRegex = /(https?:\/\/)?(www\.)?instagram\.com\/([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/;
		const splitUsername = profileUrl.match(igRegex);
		return splitUsername[3];
	} catch (err) {
		return null;
	}
};

/**
 * Parses the data of a spreadsheet to retrieve twitter accounts and add them into the database
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @returns {json} - { error: false } if successful
 */
const importData = async (req, res) => {
	// <TODO>: Add error handling to avoid crashes and return 500 instead

	// Different types of actors indicated in the spreadsheet
	let cType = 1; // current type index
	let lastDate; // date of last inserted sample
	const actors = {}; // map of actor objects to avoid creating duplicates
	mongoose.connection.collections.instagramAccount.drop();

	const tabs = req.collectives;
	const length = tabs.length;
	const iRange = req.sheet.instagramRange;
	for (let i = 0; i < length; i += 1) {
		const cTab = tabs[i];

		const rowsCount = cTab.length;
		for (let j = 0; j < rowsCount; j += 1) {
			const row = cTab[j];
			const name = row[iRange.nameRow].replace(/\n/g, " ");

			// Se estivermos na row que indicao o novo tipo, atualiza
			// a string do tipo atual e continua para a próxima row
			if (name === req.sheet.categories[cType] && cType < req.sheet.categories.length) {
				cType += 1;
				continue; // eslint-disable-line no-continue
			}

			// Se estiver em uma row com nome vazio ou a primeira
			// continue
			if (j <= 1 || !(name)) {
				continue; // eslint-disable-line no-continue
			}

			// validation of username field with regex to capture only the username
			// and not the whole profile url
			const username = matchInstagramUsername(row[iRange.profileRow]);

			// if current actor hasnt been defined yet, create a new schema
			if (actors[name] === undefined) {
				const newAccount = instagramAccount({
					name: name,
					username: username,
					type: req.sheet.categories[cType - 1],
				});
				actors[name] = newAccount;
			}

			// if current actor does not have a twitter username, continue
			if (username === null) continue; // eslint-disable-line no-continue

			// Defines sample and adds it to the actor document
			const sample = {
				date: row[iRange.dateRow],
				followers: row[iRange.followersRow],
				following: row[iRange.followingRow],
				num_of_posts: row[iRange.postsRow],
			};

			// validates all keys to a sample
			Object.entries(sample).forEach(([key, value]) => { // eslint-disable-line no-loop-func
				if (key === "date") {
					// Parses the date of the sample and use the last one if something wrong happens
					let newDate = value;
					if (newDate) newDate = newDate.split("/");
					if (!(newDate) || newDate.length !== 3) newDate = lastDate;
					lastDate = newDate;
					sample[key] = new Date(`${newDate[1]}/${newDate[0]}/${newDate[2]}`);
				} else if (!(value) || value === "s/" || value === "s") {
					sample[key] = null;
				} else if (key !== "campaigns") {
					// if string is not empty, remove all dots and commas to avoid
					// real numbers
					sample[key] = value.replace(/\.|,/g, "");
				}
			});

			actors[name].history.push(sample);
		}
	}

	// Executes save() for all actors and finishes when all of them finish
	const savePromises = [];
	Object.entries(actors).forEach(([key]) => {
		savePromises.push(actors[key].save());
	});
	await Promise.all(savePromises);
	return res.redirect("/instagram");
};

/**
 * Look for a specific registered Instagram account, by username.
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
			const username = req.params.username;
			await findAccount(req, username);
		}

		return next();
	} catch (error) {
		let username;
		if (req.actors !== undefined) {
			username = req.actors;
		} else {
			username = req.params.username;
		}
		const errorMsg = `Error ao carregar usuário ${username} dos registros do Instagram`;

		return stdErrorHand(res, errorMsg, error);
	}
};

/**
 * Data recovery about a given user
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const getUser = async (req, res) => {
	try {
		const account = req.account[0].toObject();
		account.links = [
			{
				rel: "instagram.account.latest",
				href: `${req.protocol}://${req.get("host")}/instagram/latest/${account.username}`,
			},
			{
				rel: "instagram.account.followers",
				href: `${req.protocol}://${req.get("host")}/instagram/${account.username}/followers`,
			},
			{
				rel: "instagram.account.following",
				href: `${req.protocol}://${req.get("host")}/instagram/${account.username}/following`,
			},
			{
				rel: "instagram.account.posts",
				href: `${req.protocol}://${req.get("host")}/instagram/${account.username}/posts`,
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
 * Data recovery latest about a given user
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const getLatest = async (req, res) => {
	try {
		const history = req.account[0].toObject().history;
		const length = history.length - 1;
		const latest = {};
		const limit = ResocieSheets.range.instagramTypes;
		let count = 0;

		for (let ind = length; ind >= 0 && count <= limit; ind -= 1) {
			if (latest.following === undefined
				&& history[ind].following !== undefined) {
				latest.following = history[ind].following;
				count += 1;
			}
			if (latest.followers === undefined
				&& history[ind].followers !== undefined) {
				latest.followers = history[ind].followers;
				count += 1;
			}
			if (latest.num_of_posts === undefined
				&& history[ind].num_of_posts !== undefined) {
				latest.num_of_posts = history[ind].num_of_posts;
				count += 1;
			}
		}

		req.account[0].history.latest = latest;

		res.status(httpStatus.OK).json({
			error: false,
			latest,
		});
	} catch (error) {
		const errorMsg = `Error enquanto se recuperava os últimos dados válidos para o usuário ${req.account.username}, no Instagram`;

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
	let historyKey = req.params.query;
	const errorMsg = `Não existe a caracteristica ${historyKey} para o Instagram`;

	let chartTitle;

	switch (historyKey) {
	case ResocieSheets.types.followingType:
		chartTitle = evolutionMsg("Seguindo");
		break;
	case ResocieSheets.types.followersType:
		chartTitle = evolutionMsg("Seguidores");
		break;
	case ResocieSheets.types.postType:
		historyKey = "num_of_posts";
		chartTitle = evolutionMsg("Numero de postagens");
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

	if (req.chart.data === undefined) {
		req.chart.data = [];
	}

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
		if ((account.name.length + account.username.length) > MAX_LEN_LABEL) {
			label = `${account.name}\n(${account.username})`;
		} else {
			label = `${account.name} (${account.username})`;
		}

		const dataSet = {
			data: dataUser,
			backgroundColor: color.WHITE,
			borderColor: color.getColor(),
			fill: false,
			label: label,
		};

		req.chart.dataSets.push(dataSet);
		req.chart.data.push(dataUser);
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
const getConfigLineChart = async (req, res, next) => {
	const labelXAxes = "Data";
	const labelYAxes = `Nº de ${req.chart.historyKey}`;

	const config = {
		type: "line",
		data: { datasets: req.chart.dataSets },
		options: {
			title: {
				display: true,
				text: req.chart.chartTitle,
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
 * Search for an account in the records and making it available
 * @param {object} req - standard request object from the Express library
 * @param {object} username - standard identifier of a Instagram account
 */
const findAccount = async (req, username) => {
	const account = await instagramAccount.findOne({ username });

	if (req.account === undefined) req.account = [];

	req.account.push(account);
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
	return `Evolução de ${param}, no Instagram`;
};

module.exports = {
	listAccounts,
	loadAccount,
	importData,
	getUser,
	getLatest,
	setHistoryKey,
	splitActors,
	getDataset,
	getConfigLineChart,
	plotLineChart,
};
