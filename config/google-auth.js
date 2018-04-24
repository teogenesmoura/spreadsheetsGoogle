const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

/* Reference code for OAuth and Spreadsheets:
	https://github.com/google/google-api-nodejs-client/blob/master/samples/sheets/quickstart.js
*/
const keyfile = path.join(__dirname, "credentials.json");
const keys = JSON.parse(fs.readFileSync(keyfile));
const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const client = (redirectUri) => {
	return new google.auth.OAuth2(
		keys.web.client_id,
		keys.web.client_secret,
		redirectUri,
	);
};
// Generate the url that will be used for authorization
const authorizeUrl = (cClient) => {
	return cClient.generateAuthUrl({
		access_type: "offline",
		prompt: "consent",
		scope: scopes,
	});
};

module.exports = { client, authorizeUrl };
