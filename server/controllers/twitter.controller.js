const twitterAccount = require("../models/twitter.model");

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

module.exports = { listAccounts };
