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

// const teste = new Facebook({ name: "Pedro" });

// mongoose.connect("mongodb://localhost/facebook", { keepAlive: 1 });

const test = (req, res) => {
	console.log("oi");
	/*
	teste.save((err) => {
		if (err) console.log("error");
		console.log("success");
	});
	// */

	Facebook.find({}, {}, (error, data) => {
		// return res.render("facebook/index", { list: data });
		console.log("busca");
		return console.log(data);
	});
	// console.log(facebook.find());
	// */
	res.redirect("/");
};

module.exports = { test };
