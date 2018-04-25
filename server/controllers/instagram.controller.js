const instagramAccount = require("../models/instagram.model");
const httpStatus = require("http-status");
const logger = require("../../config/logger");
const ChartNode = require("chartjs-node");

const followingType = "following";
const followersType = "followers";
const postType = "posts";
const chartSize = 600;

/**
 * Procura os nomes no banco de dados e retorna os usuários do instagram
 */

const listAccounts = async (req, res) => {
	try {
		const accounts = await instagramAccount.find({}, "name username");
		const length = accounts.length;
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
			usernames: accounts,
		});
	} catch (e) {
		const message = "Erro ao recuperar os dados de usuários do Instagram";
		logger.error(message);
		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: message,
		});
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

	const tabs = req.collectives;
	const length = tabs.length;
	const iRange = req.sheet.instagramRange;
	for (let i = 0; i < length; i += 1) {
		const cTab = tabs[i];

		const rowsCount = cTab.length;
		for (let j = 0; j < rowsCount; j += 1) {
			const row = cTab[j];
			const name = row[iRange.nameRow];

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
	return res.status(httpStatus.OK).json({
		error: false,
	});
};

const loadAccount = async (req, res, next, username) => {
	try {
		const account = await instagramAccount.findOne({ username });
		req.account = account;
		return next();
	} catch (e) {
		return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: `Não consegui recuperar informações do usuário ${username}`,
		});
	}
};

const getUser = async (req, res) => {
	try {
		const account = req.account.toObject();
		account.links = [
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
		const errorMsg = "Internal server error while responding with account";

		logger.error(errorMsg);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

const getLatest = async (req, res) => {
	try {
		const history = req.account.toObject().history;
		const length = history.length - 1;
		const latest = {};
		let count = 0;

		for (let ind = length; ind >= 0 && count <= 3; ind -= 1) {
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

		req.account.history.latest = latest;

		res.status(httpStatus.OK).json({
			error: false,
			results: latest,
		});
	} catch (error) {
		const errorMsg = `Error while getting samples of Instagram user ${req.account.username}`;

		logger.error(errorMsg);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

const setHistoryKey = async (req, res, next) => {
	let historyKey = req.params.query;
	const errorMsg = `Requisição inválida para o usuário ${req.account.username}`;

	let chartTitle;

	switch (historyKey) {
	case followingType:
		chartTitle = evolutionMsg("Seguindo");
		break;
	case followersType:
		chartTitle = evolutionMsg("Seguidores");
		break;
	case postType:
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
		backgroundColor: "#ffffff",
		borderColor: "#4286f4",
		fill: false,
		label: `${req.account.name} (${req.account.username})`,
	}];

	req.chart.dataSets = dataSet;
	req.chart.data = dataUser;

	next();
};

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
				}],
			},
		},
	};

	req.chart.config = config;

	next();
};

const plotLineChart = async (req, res) => {
	const chart = new ChartNode(chartSize, chartSize);

	await chart.drawChart(req.chart.config);
	const buffer = await chart.getImageBuffer("image/png");
	res.writeHeader(httpStatus.OK, { "Content-type": "image/png" });
	res.write(buffer);
	res.end();
};

const evolutionMsg = (param) => {
	return `Evolução de ${param}`;
};

module.exports = {
	listAccounts,
	loadAccount,
	importData,
	getUser,
	getLatest,
	setHistoryKey,
	getDataset,
	getConfigLineChart,
	plotLineChart,
};
