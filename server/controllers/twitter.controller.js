const httpStatus = require("http-status");
const Chart = require("chartjs-node");
const twitterAccount = require("../models/twitter.model");
const logger = require("../../config/logger");
const mongoose = require("mongoose");

/**
 * Retrieves all twitterAccount documents on the db and lists its name and username properties
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @returns {json} - with the properties error (false if no error occurred) and usernames (an
 * array with multiple objects containing `name` and `username` properties
 */
const listAccounts = async (req, res) => {
	try {
		const accounts = await twitterAccount.find({}, "name username");
		const length = accounts.length;
		const importLink = {
			rel: "twitter.import",
			href: `${req.protocol}://${req.get("host")}/twitter/import`,
		};
		for (let i = 0; i < length; i += 1) {
			accounts[i] = accounts[i].toObject();
			accounts[i].links = [];
			if (accounts[i].username) {
				const link = {
					rel: "twitter.account",
					href: `${req.protocol}://${req.get("host")}/twitter/${accounts[i].username}`,
				};
				accounts[i].links.push(link);
			}
		}
		res.status(httpStatus.OK).json({
			error: false,
			import: importLink,
			accounts,
		});
	} catch (e) {
		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: "Erro ao carregar os usuários do Twitter do banco de dados",
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
		const account = req.account.toObject();
		account.links = [
			{
				rel: "twitter.account.latest",
				href: `${req.protocol}://${req.get("host")}/twitter/latest/${account.username}`,
			},
			{
				rel: "twitter.account.tweets",
				href: `${req.protocol}://${req.get("host")}/twitter/${account.username}/tweets`,
			},
			{
				rel: "twitter.account.followers",
				href: `${req.protocol}://${req.get("host")}/twitter/${account.username}/followers`,
			},
			{
				rel: "twitter.account.following",
				href: `${req.protocol}://${req.get("host")}/twitter/${account.username}/following`,
			},
			{
				rel: "twitter.account.likes",
				href: `${req.protocol}://${req.get("host")}/twitter/${account.username}/likes`,
			},
			{
				rel: "twitter.account.moments",
				href: `${req.protocol}://${req.get("host")}/twitter/${account.username}/moments`,
			},
		];
		res.status(httpStatus.OK).json({
			error: false,
			account,
		});
	} catch (error) {
		const errorMsg = "Internal server error while responding with account";
		logger.error(`${errorMsg} - Details: ${error}`);
		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

const matchTwitterUsername = (username) => {
	try {
		if (!(username) || !(username.includes("twitter.com"))) return null;
		const twitterRegex = /((https?:\/\/)?(www\.)?twitter\.com\/)?(@|#!\/)?([A-Za-z0-9_]{1,15})(\/([-a-z]{1,20}))?/;
		const splitUsername = username.match(twitterRegex);
		return splitUsername[5];
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
	const tRange = req.sheet.twitterRange;
	mongoose.connection.collections.twitterAccount.drop();
	for (let i = 0; i < length; i += 1) {
		const cTab = tabs[i];

		const rowsCount = cTab.length;
		for (let j = 0; j < rowsCount; j += 1) {
			const row = cTab[j];
			const name = row[tRange.nameRow];

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
			const username = matchTwitterUsername(row[tRange.profileRow]);

			// if current actor hasnt been defined yet, create a new schema
			if (actors[name] === undefined) {
				const newAccount = twitterAccount({
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
				date: row[tRange.dateRow],
				likes: row[tRange.likesRow],
				followers: row[tRange.followersRow],
				following: row[tRange.followingRow],
				moments: row[tRange.momentsRow],
				tweets: row[tRange.tweetsRow],
				campaigns: row[tRange.campaignsRow],
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

			actors[name].samples.push(sample);
		}
	}

	// Executes save() for all actors and finishes when all of them finish
	const savePromises = [];
	Object.entries(actors).forEach(([key]) => {
		savePromises.push(actors[key].save());
	});
	await Promise.all(savePromises);
	return res.redirect("/twitter");
};

/**
 * Loads a twitter Account and pass it into the req.account object
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @param {object} next - standard next object from the Express libary
 * @param {string} username - username of the account to be loaded
 */
const loadAccount = async (req, res, next, username) => {
	try {
		const account = await twitterAccount.findOne({ username });
		req.account = account;
		return next();
	} catch (e) {
		return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: `Erro ao carregar o usuário ${username} no banco de dados`,
		});
	}
};

/**
 * Creates a sample from the last defined samples for each property
 * since samples are only required to have a date filled
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @returns {json} - with the properties error (false if no error occurred) and account with the
 * following properties: _id, name, username, lastSample (likes, tweets, followers, following,
 * moments).
 */
const userLastSample = async (req, res) => {
	try {
		const samples = req.account.samples;
		const length = samples.length - 1;
		const latest = {};

		for (let i = length; i >= 0; i -= 1) {
			if (latest.likes === undefined && samples[i].likes !== undefined) {
				latest.likes = samples[i].likes;
			}
			if (latest.tweets === undefined && samples[i].tweets !== undefined) {
				latest.tweets = samples[i].tweets;
			}
			if (latest.followers === undefined && samples[i].followers !== undefined) {
				latest.followers = samples[i].followers;
			}
			if (latest.following === undefined && samples[i].following !== undefined) {
				latest.following = samples[i].following;
			}
			if (latest.moments === undefined && samples[i].moments !== undefined) {
				latest.moments = samples[i].moments;
			}
		}

		res.status(httpStatus.OK).json({
			error: false,
			latest,
		});
	} catch (e) {
		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: "Erro ao carregar amostras",
		});
	}
};

/**
 * Middleware function that selects the correct property to retrieve data of the account
 *  based on the path of the url
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @param {object} next - standard next object from the Express libary
 */
const setSampleKey = async (req, res, next) => {
	// Pega o último elemento da URL para ver qual o parâmetro
	// da conta a ser analisado. Ex: /twitter/john/likes -> likes
	const sampleKey = req.params.query;

	// Título do gráfico gerado
	let mainLabel;

	// Analisa o caminho da rota que chegou nesta função para
	// ter um título com o parâmetro correto.
	switch (sampleKey) {
	case "likes":
		mainLabel = "Evolução do número de curtidas";
		break;
	case "followers":
		mainLabel = "Evolução do número de seguidores";
		break;
	case "following":
		mainLabel = "Evolução do número de usuários que segue";
		break;
	case "tweets":
		mainLabel = "Evolução do número de tweets";
		break;
	case "moments":
		mainLabel = "Evolução do número de momentos";
		break;
	default:
		// Se chegou até aqui, a função está sendo chamada por uma rota
		// com um parâmetro diferente dos aceitáveis.
		return res.status(httpStatus.NOT_FOUND).json({
			error: true,
			description: `Query invalida para usuário ${req.account.username}`,
		});
	}

	req.chart = {
		sampleKey: sampleKey,
		mainLabel: mainLabel,
	};
	return next();
};

/**
 * Creates a dataset to be used on the creation of a Chart object later on, this
 * dataset is based in the req.chart.sampleKey string
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @param {object} next - standard next object from the Express libary
 */
const createDataset = async (req, res, next) => {
	// Carrega as samples da conta do usuário
	const samples = req.account.samples;
	const sampleKey = req.chart.sampleKey;

	const data = [];
	const labels = [];

	// Itera sobre todas as samples e adiciona aquelas que tem o dado procurado
	// na array de dados `data`
	const length = samples.length;
	for (let i = 0; i < length; i += 1) {
		if (samples[i][sampleKey] !== undefined && samples[i][sampleKey] !== null) {
			const date = new Date(samples[i].date);
			data.push({
				x: date,
				y: samples[i][sampleKey],
			});
			labels.push(date);
		}
	}

	const dataset = [{
		data: data,
		backgroundColor: "#ff0000",
		borderColor: "#ff0000",
		fill: false,
		label: `${req.account.name} (${req.account.username})`,
	}];

	req.chart.datasets = dataset;
	next();
};

/**
 * Draws the chart into a buffer and send it as a response to the request.
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @param {object} next - standard next object from the Express libary
 */
const drawLineChart = async (req, res) => {
	const mainLabel = req.chart.mainLabel;
	const datasets = req.chart.datasets;
	const chartNode = new Chart(600, 600);
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
						labelString: "Date",
					},
				}],
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: "value",
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

module.exports = {
	listAccounts,
	loadAccount,
	setSampleKey,
	getUser,
	createDataset,
	importData,
	drawLineChart,
	userLastSample,
};
