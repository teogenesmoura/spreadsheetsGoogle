const httpStatus = require("http-status");
const Chart = require("chartjs-node");
const mongoose = require("mongoose");
const twitterAccount = require("../models/twitter.model");
const logger = require("../../config/logger");
const color = require("./color.controller");
const ResocieSheets = require("../../config/resocie.json").spreadsheets;

const MAX_LEN_LABEL = 80;

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
	} catch (error) {
		const errorMsg = "Erro ao carregar usuários do Twitter nos registros";

		stdErrorHand(res, errorMsg, error);
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
		const errorMsg = "Erro enquanto configura-se o usuário";

		stdErrorHand(res, errorMsg, error);
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
			const name = row[tRange.nameRow].replace(/\n/g, " ");

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
 * @param {object} next - standard next object from the Express library
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
		const errorMsg = `Error ao carregar usuário ${username} dos registros do Twitter`;

		return stdErrorHand(res, errorMsg, error);
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
		const account = req.account[0].toObject();
		const samples = req.account[0].samples;
		const length = samples.length - 1;
		const limit = ResocieSheets.range.twitterTypes;
		const lastSample = {};
		let count = 0;

		for (let i = length; i >= 0 && count <= limit; i -= 1) {
			if (lastSample.likes === undefined && samples[i].likes !== undefined) {
				lastSample.likes = samples[i].likes;
				count += 1;
			}
			if (lastSample.tweets === undefined && samples[i].tweets !== undefined) {
				lastSample.tweets = samples[i].tweets;
				count += 1;
			}
			if (lastSample.followers === undefined && samples[i].followers !== undefined) {
				lastSample.followers = samples[i].followers;
				count += 1;
			}
			if (lastSample.following === undefined && samples[i].following !== undefined) {
				lastSample.following = samples[i].following;
				count += 1;
			}
			if (lastSample.moments === undefined && samples[i].moments !== undefined) {
				lastSample.moments = samples[i].moments;
				count += 1;
			}
		}

		account.lastSample = lastSample;

		res.status(httpStatus.OK).json({
			error: false,
			account,
		});
	} catch (error) {
		const errorMsg = `Error enquanto se recuperava os últimos dados válidos para o usuário ${req.account.name}, no Twitter`;

		stdErrorHand(res, errorMsg, error);
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
	const errorMsg = `Não existe a caracteristica [${sampleKey}] para o Twitter`;

	// Título do gráfico gerado
	let mainLabel;

	// Analisa o caminho da rota que chegou nesta função para
	// ter um título com o parâmetro correto.
	switch (sampleKey) {
	case ResocieSheets.types.likesType:
		mainLabel = evolutionMsg("curtidas");
		break;
	case ResocieSheets.types.followersType:
		mainLabel = evolutionMsg("seguidores");
		break;
	case ResocieSheets.types.followingType:
		mainLabel = evolutionMsg("usuários que segue");
		break;
	case ResocieSheets.types.tweetsType:
		mainLabel = evolutionMsg("tweets");
		break;
	case ResocieSheets.types.momentsType:
		mainLabel = evolutionMsg("momentos");
		break;
	default:
		// Se chegou até aqui, a função está sendo chamada por uma rota
		// com um parâmetro diferente dos aceitáveis.
		logger.error(`${errorMsg} - Tried to access ${req.originalUrl}`);
		return res.status(httpStatus.NOT_FOUND).json({
			error: true,
			description: errorMsg,
		});
	}

	req.chart = {
		sampleKey: sampleKey,
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
 * Creates a dataset to be used on the creation of a Chart object later on, this
 * dataset is based in the req.chart.sampleKey string
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @param {object} next - standard next object from the Express libary
 */
const createDataset = async (req, res, next) => {
	// Carrega as samples da conta do usuário
	const sampleKey = req.chart.sampleKey;
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
		const samples = account.samples;
		const length = samples.length;
		// const labels = [];

		for (let ind = 0; ind < length; ind += 1) {
			if (samples[ind][sampleKey] !== undefined
				&& samples[ind][sampleKey] !== null) {
				const date = new Date(samples[ind].date);

				dataUser.push({
					x: date,
					y: samples[ind][sampleKey],
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
		// req.chart.data.push(dataUser);
	});

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
	const datasets = req.chart.dataSets;
	const chartNode = new Chart(700, 700);
	const labelXAxes = "Data";
	const labelYAxes = `Nº de ${req.chart.sampleKey}`;

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
 * @param {object} username - standard identifier of a Twitter account
 */
const findAccount = async (req, username) => {
	const account = await twitterAccount.findOne({ username });

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
	return `Evolução de ${param}, no Twitter`;
};

module.exports = {
	listAccounts,
	loadAccount,
	setSampleKey,
	splitActors,
	getUser,
	createDataset,
	importData,
	drawLineChart,
	userLastSample,
};
