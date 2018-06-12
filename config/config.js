// require and configure dotenv, will load vars in .env in PROCESS.ENV
require("dotenv").config();

const config = {
	env: process.env.NODE_ENV,
	port: process.env.PORT,
	mongo: {
		host: `${process.env.MONGO_HOST}-${process.env.NODE_ENV}`,
		port: process.env.MONGO_PORT,
	},
};

module.exports = config;
