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

const test = (req, res) => {
	console.log("oi");

	Facebook.find((error, data) => {
		return console.log(`${data}`);
	});

	res.redirect("/");
};

const signUpInit = (req, res) => {
	const teste = new Facebook({
		name: "Maria José",
		class: "tstClass",
		link: "www.maria.jose.com",
		history: [{ likes: 42, followers: 4200, date: new Date(94, 2, 21) }],
	});

	teste.save((err) => {
		if (err) console.log(`error ${err}`);
		console.log("success");
	});

	res.redirect("/");
};

module.exports = { test, signUpInit };
