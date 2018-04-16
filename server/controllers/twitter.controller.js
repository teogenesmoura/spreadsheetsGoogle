const httpStatus = require("http-status");
const twitterAccount = require("../models/twitter.model");
const Chart = require("chartjs-node");

// Procura todas as contas no banco de dados e retorna todos os usuários
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

const importData = async (req, res) => {
	const tabs = req.collectives;
	const length = tabs.length;
	const types = [
		"FRENTES / COLETIVOS",
		"ORGANIZAÇÕES DA SOCIEDADE CIVIL",
	];
	let cType = 0;
	let lastDate;

	const actors = {};
	for (let i = 0; i < length; i += 1) {
		const cTab = tabs[i];

		const rowsCount = cTab.length;
		for (let j = 0; j < rowsCount; j += 1) {
			const row = cTab[j];
			// Se estivermos na row que indicao o novo tipo, atualiza
			// a string do tipo atual e continua para a próxima row
			if (row[0] === "ORGANIZAÇÕES DA SOCIEDADE CIVIL") {
				cType += 1;
				continue; // eslint-disable-line no-continue
			}

			// Se estiver em uma row com nome vazio ou a primeira
			// continue
			if (j <= 1 || !(row[0])) {
				continue; // eslint-disable-line no-continue
			}
			let username;
			if (!(row[7]) || !(row[7].includes("twitter.com"))) username = null;
			else {
				username = row[7].match(/((https?:\/\/)?(www\.)?twitter\.com\/)?(@|#!\/)?([A-Za-z0-9_]{1,15})(\/([-a-z]{1,20}))?/);
				username = username[5];
			}

			if (actors[row[0]] === undefined) {
				const newAccount = twitterAccount({
					name: row[0],
					username: username,
					type: types[cType],
				});
				actors[row[0]] = newAccount;
			}

			if (username) {
				console.log(row);
				for (let k = 8; k <= 14; k += 1) {
					if (!(row[k]) || row[k] === "-" || row[k] === "s" || row[k] === "s/") row[k] = null;
					else if (k <= 11) {
						if (k == 10) console.log(k);
						row[k] = row[k].replace(/\.|,/g, "");
					}
				}
				// <TODO>: Fix nasty ifs when the tabs are corrected to be equal
				let newDate = row[(i > 1 ? 13 : 14)];
				if (newDate) newDate = newDate.split("/");
				if (!(newDate) || newDate.length !== 3) newDate = lastDate;
				lastDate = newDate;
				const sample = {
					date: new Date(`${newDate[1]}/${newDate[0]}/${newDate[2]}`),
					likes: row[11],
					followers: row[10],
					following: row[9],
					moments: (i > 1 ? null : row[12]),
					tweets: row[8],
					campaigns: (row[(i > 1 ? 12 : 13)] ? row[(i > 1 ? 12 : 13)].split("#") : []),
				};
				actors[row[0]].samples.push(sample);
			}
		}
	}
	const savePromises = [];
	Object.entries(actors).forEach(([key]) => {
		savePromises.push(actors[key].save());
	});
	await Promise.all(savePromises);
	return res.status(httpStatus.OK).json({
		error: false,
	});
};

// Carrega uma conta com username específico
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

// Mostra a última amostra de dados do usuário
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

// Responde com uma imagem (gráfico)
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
		backgroundColor: "#ffffff",
		borderColor: "#ffffff",
		fill: false,
		label: `${req.account.name} (${req.account.username})`,
	}];

	req.chart.datasets = dataset;
	next();
};

// Desenha um gráfico de linha que usa o tempo como eixo X
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
