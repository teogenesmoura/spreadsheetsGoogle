const httpStatus = require("http-status");
const twitterAccount = require("../models/twitter.model");
const Chart = require("chartjs-node");

// Procura todas as contas no banco de dados e retorna todos os usuários
const listAccounts = async (req, res) => {
	try {
		const accounts = await twitterAccount.find({}, "username -_id");
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
	drawLineChart,
};
