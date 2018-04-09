// const logger = require("../../config/logger");

/* module.exports = (app) => {
	const facebook = app.server.models.facebook.model;

	const facebookController = {
		index: (req, res) => {
			facebook.find((error, data) => {
				/* if(error){}
				else
				//
				return res.render("facebook/index", { list: data });
			});
		},
	};
	return facebookController;
}; */

// const mongoose = require("mongoose");
const Facebook = require("../models/facebook.model");
const collectives = require("../tests/spreadsheets-collectives.json");

const find = (req, res) => {
	console.log("Busca no banco");
	Facebook.find((error, datas) => {
		return console.log(`${datas}`);
	});

	res.redirect("/");
};

const tstInsertion = (req, res) => {
	console.log("Inserção de Teste no banco");
	const teste = new Facebook({
		name: "Maria José",
		class: "tstClass",
		link: "www.maria.jose.com",
		history: [{
			likes: 42,
			followers: 4200,
			date: new Date(94, 2, 21),
		}],
	});

	teste.save((err) => {
		if (err) console.log(`error ${err}`);
		console.log("success");
	});

	res.redirect("/facebook");
};

const signUpInit = (req, res) => {
	console.log("Inserção de dados no banco");

	console.log(`Collectives[2][0]: ${collectives[2][0]}`);

	res.redirect("/facebook");
};

module.exports = { find, tstInsertion, signUpInit };
