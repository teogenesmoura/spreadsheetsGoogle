const httpStatus = require("http-status");
const youtubeAccount = require("../models/youtube.model");
const ChartNode = require("chartjs-node");
const logger = require("../../config/logger");

// Carrega todos os usuários do banco de dados
const listAccounts = async (req, res) => {
	try {
		const accounts = await youtubeAccount.find({}, "name -_id");
		res.status(httpStatus.OK).json({
			error: false,
			accounts: accounts,
		});
	} catch (error) {
		const msg = "Erro ao carregar os usuários do YouTube do banco de dados";
		logger.error(msg);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: msg,
		});
	}
};

const importData = async (req, res) => {
	const actors = {};
	const tabs = req.collectives;
	const length = tabs.length;
	const categories = req.sheet.categories;
	const youtubeRange = req.sheet.youtubeRange;
	const nameRow = req.sheet.range.nameRow;
	const dateRow = youtubeRange.dateRow;
	const channelRow = youtubeRange.channelRow;
	const subscribRow = youtubeRange.subscribRow;
	const videosRow = youtubeRange.videosRow;
	const viewsRow = youtubeRange.viewsRow;
	let cCategory;
	let lastDate;

	for (let ind = 0; ind < length; ind += 1) {
		const cTab = tabs[ind];
		const rowsCount = cTab.length;
		cCategory = 0;

		for (let j = 0; j < rowsCount; j += 1) {
			const cRow = cTab[j];

			if (j < 1 || !(cRow[nameRow])) {
				continue; // eslint-disable-line no-continue
			}

			if (cRow[nameRow] === categories[cCategory + 1]) {
				cCategory += 1;
				continue; // eslint-disable-line no-continue
			}
			// Se estiver em uma row com nome vazio ou a primeira
			// continue

			let channel;
			if (isCellValid(cRow[channelRow])) {
				channel = cRow[channelRow];
			} else {
				channel = null;
			}
			// Cria um novo schema para caso nao exista no bd
			if (actors[cRow[nameRow]] === undefined) {
				const newAccount = youtubeAccount({
					name: cRow[nameRow],
					category: categories[cCategory],
					channelUrl: channel,
				});
				actors[cRow[nameRow]] = newAccount;
			}	

			if (channel) {
				console.log(channel);
				for (let k = subscribRow; k <= viewsRow; k += 1) {
					console.log("valor k");
					console.log(k);
					console.log(cRow[k]);

					if (!isCellValid(cRow[k])) {
						console.log("invalido");
						cRow[k] = null;
					} else {
						// restringir esta parte
						cRow[k] = parseInt(cRow[k].replace(/\.|,/g, ""), 10);
						console.log(cRow);
						if (Number.isNaN(cRow[k])) cRow[k] = null;
					}
				}

				// Parses the date of the sample and use the last one if something wrong happens
				let newDate = cRow[dateRow];
				if (newDate) newDate = newDate.split("/");
				if (!(newDate) || newDate.length !== 3) newDate = lastDate;
				lastDate = newDate;

				// Defines sample and adds it to the actor document
				const newHistory = {
					subscribers: cRow[subscribRow],
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

// Carrega uma conta de usuário específico
const loadAccount = async (req, res, next, name) => {
	try {
		const account = await youtubeAccount.findOne({ name }, "-_id -_v");
		req.account = account;
		return next();
	} catch (error) {
		const msg = `Erro ao carregar o usuário ${name} no banco de dados`;
		logger.error(msg);

		return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: msg,
		});
	}
};

const getUser = async (req, res) => {
	try {
		const account = req.account;

		res.status(httpStatus.OK).json({
			error: false,
			account: account,
		});
	} catch (error) {
		const msg = "Erro interno do servidor enquanto buscava a conta";
		logger.error(msg);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: msg,
		});
	}
};

const setHistoryKey = async (req, res, next) => {
	const historyKey = req.params.query;

	// Título do gráfico gerado
	let mainLabel;

	// Analisa o caminho da rota que chegou nesta função para
	// ter um título com o parâmetro correto.
	switch (historyKey) {
	case "subscribers":
		mainLabel = "Evolução do número de curtidas";
		break;
	case "videos":
		mainLabel = "Evolução do número de seguidores";
		break;
	case "views":
		mainLabel = "Evolução do número de usuários que segue";
		break;
	default:
		const msg = `Não existe a caracteristica ${channelKey} para o YouTube`;
		logger.error(msg);

		return res.status(httpStatus.NOT_FOUND).json({
			error: true,
			description: msg,
		});
	}

	req.chart = {
		historyKey: historyKey,
		mainLabel: mainLabel,
	};
	return next();
};

// Responde com uma imagem (gráfico)
const getDataset = async (req, res, next) => {
	// Carrega as samples da conta do usuário
	const history = req.account.history;
	const historyKey = req.chart.historyKey;

	const data = [];
	// const labels = [];

	// Itera sobre todas as samples e adiciona aquelas que tem o dado procurado
	// na array de dados `data`
	const length = history.length;
	for (let ind = 0; ind < length; ind += 1) {
		const value = history[ind][historyKey];

		if (value !== undefined && value !== null) {
			const date = new Date(history[ind].date);
			data.push({
				x: date,
				y: value,
			});
			// labels.push(date);
		}
	}

	const dataset = [{
		data: data,
		backgroundColor: "#ff0000",
		borderColor: "#ffffff",
		fill: false,
		label: `${req.account.name} (${req.account.chanelUrl})`,
	}];

	req.chart.datasets = dataset;
	next();
};

// Desenha um gráfico de linha que usa o tempo como eixo X
const drawLineChart = async (req, res) => {
	const mainLabel = req.chart.mainLabel;
	const datasets = req.chart.datasets;
	const historyKey = req.chart.historyKey;
	const chartNode = new ChartNode(600, 600);
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
						labelString: "Data",
					},
				}],
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: `Nº de ${historyKey}`,
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

const isCellValid = (value) => {
	if (!(value) || value === "-" || value === "s" || value === "s/" || value === "S" || value ==="S/") {
		return false;
	}

	return true;
};

module.exports = {
	listAccounts,
	loadAccount,
	getUser,
	setHistoryKey,
	getDataset,
	drawLineChart,
	importData,

};
