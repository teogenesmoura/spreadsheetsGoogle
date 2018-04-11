const twitterAccount = require("../models/twitter.model");
const Chart = require("chartjs-node");

// Procura todas as contas no banco de dados e retorna todos os usuários
const listAccounts = async (req, res) => {
	try {
		const accounts = await twitterAccount.find({}, "username -_id");
		res.status(200).json({
			error: false,
			usernames: accounts,
		});
	} catch (e) {
		res.status(500).json({
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
		return res.status(500).json({
			error: true,
			description: `Erro ao carregar o usuário ${username} no banco de dados`,
		});
	}
};

// Responde com uma imagem (gráfico)
const likeProgress = async (req, res) => {
	const samples = req.account.samples;

	const mainLabel = "Evolução de curtidas";
	const data = [];
	const labels = [];

	const length = samples.length;
	for (let i = 0; i < length; i += 1) {
		if (samples[i].likes !== undefined && samples[i].likes !== null) {
			const date = new Date(samples[i].date);
			data.push({
				x: date,
				y: samples[i].likes,
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

	const chart = await drawLineChart(mainLabel, dataset);
	const buffer = await chart.getImageBuffer("image/png");
	res.writeHead(200, { "Content-Type": "image/png" });
	res.write(buffer);
	res.end();
};


// Desenha um gráfico de linha que usa o tempo como eixo X
const drawLineChart = async (mainLabel, datasets) => {
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
	return chartNode;
};

module.exports = { listAccounts, loadAccount, likeProgress };
