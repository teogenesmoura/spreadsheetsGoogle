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

/**
 * Search for all registered Facebook accounts.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const find = async (req, res) => {
	console.log("Busca no banco");

	const cursor = await Facebook.find().cursor();
	await cursor.on("data", (doc) => {
		console.log(`{ Name: ${doc.name},`);
		console.log(`  Class: ${doc.class},`);
		console.log(`  Link: ${doc.link},`);
		console.log("  History: [");
		doc.history.forEach((time) => {
			console.log(`\t{ Likes: ${time.likes}, `);
			console.log(`\t  Followers: ${time.followers},`);
			console.log(`\t  Date: ${time.date}`);
			console.log("\t}");
		});
		console.log("  ]");
		console.log("}");
	});

	res.redirect("/facebook");
};

/**
 * Insertion test for a single record in Facebook accounts.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const tstInsertion = (req, res) => {
	console.log("Inserção de Teste no banco");

	Facebook.findOne({ name: "Maria José" }, (err, account) => {
		if (err) console.log(`error ${err}`);

		if (!account) {
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

			teste.save((error) => {
				if (error) console.log(`error ${err}`);
				console.log("success");
			});
		}
	});

	/*
	*/

	res.redirect("/facebook");
};

/**
 * Insert all Facebook accounts available.
 * @param {object} req - standard request object from the Express library
 * @param {object} res - standard response object from the Express library
 */
const signUpInit = async (req, res) => {
	console.log("Inserção de dados no banco");

	//	Atualização de dados
	Facebook.findOne({ name: "Rodrigo" }, (err, account) => {
		if (err) console.log(`error ${err}`);

		account.name = "Rodrigo F.G.";
		account.save((error) => {
			if (error) console.log(`error ${error}`);
			console.log("success update");
		});
	});

	//	Incremento no histórico temporal
	Facebook.findOne({ name: "Rodrigo F.G." }, (err, account) => {
		if (err) console.log(`error ${err}`);
		const history = { likes: 24, followers: 240, date: Date.now() };
		account.history.push(history);
		account.save((error) => {
			if (error) console.log(`error ${error}`);
			console.log("success update");
		});
	});

	//	Consulta na tabela de dados
	console.log(`Collectives[2][0]: ${collectives[2][0]}`);

	res.redirect("/facebook");
};

module.exports = { find, tstInsertion, signUpInit };
