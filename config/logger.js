const winston = require("winston");

const format = winston.format;
const { combine, colorize, printf } = format;

const customLevels = {
	levels: {
		trace: 4,
		info: 3,
		warn: 2,
		error: 1,
		critical: 0,
	},
	colors: {
		trace: "gray",
		info: "green",
		warn: "yello",
		error: "red",
		critical: "purple",
	},
};

const tsLvlMsgFormat = printf((info) => {
	return `[${info.timestamp}] - [${info.level}] - ${info.message}`;
});

winston.addColors(customLevels.colors);

const logger = winston.createLogger({
	level: "info",
	format: combine(
		winston.format.timestamp({
			format: "YYYY-MM-DD HH:mm:ss",
		}),
		tsLvlMsgFormat,
	),
	transports: [
		//
		// - Write to all logs with level `info` and below to `combined.log`
		// - Write all logs error (and below) to `error.log`.
		//
		new winston.transports.Console({ level: "info" }),
		new winston.transports.File({ filename: "./logs/error.log", level: "error" }),
		new winston.transports.File({ filename: "./logs/combined.log" }),
	],
	levels: customLevels.levels,
});

module.exports = logger;
