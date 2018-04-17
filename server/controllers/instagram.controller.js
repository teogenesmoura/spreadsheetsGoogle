const instagramAccount = require("../models/instagram.model");
const httpStatus = require("http-status");
const logger = require("../../config/logger");

const followingType = "following";
const followersType = "followers";
const postType = "num_of_posts";
/**
 * Procura os nomes no banco de dados e retorna os usuários do instagram
 */

const listAccounts = async (req, res) => {
	try {
		const accounts = await instagramAccount.find({}, "name -_id");
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

const loadAccount = async (req, res, next, name) => {
	try {
		const account = await instagramAccount.findOne({ name });
		req.account = account;
		return next();
	} catch (e) {
		return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: `Não consegui recuperar informações do usuário ${name}`,
		});
	}
};

const getUser = async (req, res) => {
	try {
		const account = req.account;

		res.status(httpStatus.OK).json({
			error: false,
			results: account,
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
		const errorMsg = `Error while getting samples of Instagram user ${req.account.name}`;

		logger.error(errorMsg);

		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: errorMsg,
		});
	}
};

const setHistoryKey = async (req, res, next) => {
	const historyKey = req.params.query;
	const errorMsg = `Requisição inválida para o usuário ${req.account.name}`;

	let chartTitle;

	switch (historyKey) {
	case followingType:
		chartTitle = evolutionMsg("Seguindo");
		break;
	case followersType:
		chartTitle = evolutionMsg("Seguidores");
		break;
	case postType:
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

const evolutionMsg = (param) => {
	return `Evolução de ${param}`;
};

module.exports = {
	listAccounts,
	loadAccount,
	getUser,
	getLatest,
	setHistoryKey,
};
