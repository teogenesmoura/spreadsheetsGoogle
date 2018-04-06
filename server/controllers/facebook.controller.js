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

const test = (req, res) => {
	console.log("oi");

	res.redirect("/");
};

module.exports = { test };
