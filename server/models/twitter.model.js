const mongoose = require("mongoose");

const sampleSchema = {
	date: {
		type: Date,
		required: true,
	},
	tweets: {
		type: Number,
	},
	followers: {
		type: Number,
	},
	following: {
		type: Number,
	},
	likes: {
		type: Number,
	},
	moments: {
		type: Number,
	},
};

const twitterAccountSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	username: {
		type: String,
	},
	type: {
		type: String,
	},
	sample: [sampleSchema],
	campaigns: {
		type: [String],
	},
});

module.exports = mongoose.model("twitterAccount", twitterAccountSchema);
