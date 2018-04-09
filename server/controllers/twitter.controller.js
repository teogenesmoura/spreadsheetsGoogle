const twitterAccount = require("../models/twitter.model");

const listAccounts = (req, res) => {
	twitterAccount.find({}, "username -_id")
		.then((accounts) => {
			res.status(200).json({
				error: false,
				usernames: accounts,
			});
		})
		.catch(() => {
			return res.status(500).json({
				error: true,
				description: "Erro ao carregar os usuários do twitter do banco de dados",
			});
		});
};

module.exports = { listAccounts };
