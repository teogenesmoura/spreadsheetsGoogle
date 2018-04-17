const httpStatus = require("http-status");
const twitterAccount = require("../models/twitter.model");
const Chart = require("chartjs-node");

/**
 * Retrieves all twitterAccount documents on the db and lists its name and username properties
 * @param {object} req - standard req object from the Express library
 * @param {object} res - standard res object from the Express library
 * @returns {json} - with the properties error (false if no error occurred) and usernames (an
 * array with multiple objects containing `name` and `username` properties
 */
const listAccounts = async (req, res) => {
	try {
		const accounts = await twitterAccount.find({}, "name username -_id");
		res.status(httpStatus.OK).json({
			error: false,
			usernames: accounts,
		});
	} catch (e) {
		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: "Erro ao carregar os usuários do Twitter do banco de dados",
		});
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
	const types = [
		"FRENTES / COLETIVOS",
		"ORGANIZAÇÕES DA SOCIEDADE CIVIL",
		"PRÉ-CANDIDATURAS À PRESIDÊNCIA",
	];
	let cType = 0; // current type index
	let lastDate; // date of last inserted sample
	const actors = {}; // map of actor objects to avoid creating duplicates

	const tabs = req.collectives;
	const length = tabs.length;
	for (let i = 0; i < length; i += 1) {
		const cTab = tabs[i];

		const rowsCount = cTab.length;
		for (let j = 0; j < rowsCount; j += 1) {
			const row = cTab[j];
			// row[0] = Actor name
			// row[7] = Twitter username (profile url)
			// row[8] = Number of tweets in that date
			// row[9] = Number of people that account is following in that date
			// row[10] = Number of followers in that date
			// row[11] = Number of likes in that date
			// row[12] = Number of moments in that date
			// row[13] = List of campaigns in that date
			// row[14] = Date of the sample

			// Se estivermos na row que indicao o novo tipo, atualiza
			// a string do tipo atual e continua para a próxima row
			if (row[0] === types[1]) {
				cType = 1;
				continue; // eslint-disable-line no-continue
			} else if (row[0] === types[2]) {
				cType = 2;
				continue; // eslint-disable-line no-continue
			}

			// Se estiver em uma row com nome vazio ou a primeira
			// continue
			if (j <= 1 || !(row[0])) {
				continue; // eslint-disable-line no-continue
			}

			// validation of username field with regex to capture only the username
			// and not the whole profile url
			let username;
			if (!(row[7]) || !(row[7].includes("twitter.com"))) username = null;
			else {
				username = row[7].match(/((https?:\/\/)?(www\.)?twitter\.com\/)?(@|#!\/)?([A-Za-z0-9_]{1,15})(\/([-a-z]{1,20}))?/);
				username = username[5];
			}

			// if current actors hasnt been defined yet, create a new schema
			if (actors[row[0]] === undefined) {
				const newAccount = twitterAccount({
					name: row[0],
					username: username,
					type: types[cType],
				});
				actors[row[0]] = newAccount;
			}

			// if current actor has a twitter username, add a sample
			if (username) {
				// Checks all rows for "empty" fields, magic strings that are used
				// to represent no data
				for (let k = 8; k <= 14; k += 1) {
					if (!(row[k]) || row[k] === "s/" || row[k] === "s") {
						row[k] = null;
					} else if (k <= 11) {
						// if string is not empty, remove all dots and commas to avoid
						// real numbers
						row[k] = row[k].replace(/\.|,/g, "");
					}
				}

				// Parses the date of the sample and use the last one if something wrong happens
				let newDate = row[14];
				if (newDate) newDate = newDate.split("/");
				if (!(newDate) || newDate.length !== 3) newDate = lastDate;
				lastDate = newDate;

				// Defines sample and adds it to the actor document
				const sample = {
					date: new Date(`${newDate[1]}/${newDate[0]}/${newDate[2]}`),
					likes: row[11],
					followers: row[10],
					following: row[9],
					moments: row[12],
					tweets: row[8],
					campaigns: (row[13] ? row[13].split("#") : []),
				};
				actors[row[0]].samples.push(sample);
			}
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
		const account = req.account.toObject();
		const samples = req.account.samples;
		const length = samples.length - 1;
		const lastSample = {};

		for (let i = length; i >= 0; i -= 1) {
			if (lastSample.likes === undefined && samples[i].likes !== undefined) {
				lastSample.likes = samples[i].likes;
			}
			if (lastSample.tweets === undefined && samples[i].tweets !== undefined) {
				lastSample.tweets = samples[i].tweets;
			}
			if (lastSample.followers === undefined && samples[i].followers !== undefined) {
				lastSample.followers = samples[i].followers;
			}
			if (lastSample.following === undefined && samples[i].following !== undefined) {
				lastSample.following = samples[i].following;
			}
			if (lastSample.moments === undefined && samples[i].moments !== undefined) {
				lastSample.moments = samples[i].moments;
			}
		}

		account.lastSample = lastSample;

		res.status(httpStatus.OK).json({
			error: false,
			account: account,
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
	createDataset,
	importData,
	drawLineChart,
	userLastSample,
};
