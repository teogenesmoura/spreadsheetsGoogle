const app = require("./config/express");
const logger = require("./config/logger");

app.listen(3000, () => {
	logger.info(`[SERVER] Listening on port ${3000}`);
});

module.exports = app;
