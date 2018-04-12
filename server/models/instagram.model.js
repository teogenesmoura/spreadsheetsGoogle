const mongoose = require("mongoose");

const nameModel = "instagramAccounts";
const collectionName = "agentAccount";

/**
 * Modelo da coleção do Instagram para um banco de dados não relacional (MongoDB).
 * Leva em consideração os seguintes aspectos:
 */


const instagramAccountSchema = new mongoose.Schema({
	date_collected: Date,
	profile: {
		name: String,
		link: String,
	},
	followers: Number,
	following: Number,
	num_of_posts: Number,
});

module.exports = mongoose.model(nameModel, instagramAccountSchema, collectionName);
