const instagramAccount = require("../models/instagram.model");
const httpStatus = require("http-status");

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
		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: true,
			description: "Erro ao recuperar os dados de usuários do Instagram\n",
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

module.exports = { listAccounts, loadAccount };
