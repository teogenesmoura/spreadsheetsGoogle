const mongoose = require("mongoose");

const nameModel = "instagramAccounts";
const collectionName = "agentAccount";

/**
 * Modelo da coleção do Instagram para um banco de dados não relacional (MongoDB).
 * Leva em consideração os seguintes aspectos:
 */

const instagramHistory = {
	date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	followers: Number,
	following: Number,
	num_of_posts: Number,
};

const instagramAccountSchema = new mongoose.Schema({
	profile: {
		name: String,
		link: String,
	},
	history: [instagramHistory],
});

module.exports = mongoose.model(nameModel, instagramAccountSchema, collectionName);
