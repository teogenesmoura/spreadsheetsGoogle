"use strict";
/* Reference code for OAuth and Spreadsheets:
	https://github.com/google/google-api-nodejs-client/blob/master/samples/sheets/quickstart.js
*/
const {google} = require("googleapis");
const express = require("express");
const path = require("path");
const fs = require("fs");
const opn = require("opn");
const keyfile = path.join(__dirname, "credentials.json");
const keys = JSON.parse(fs.readFileSync(keyfile));
const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const sheets = require("./controllers/spreadsheets");
const client = new google.auth.OAuth2(
	keys.web.client_id,
	keys.web.client_secret,
	keys.web.redirect_uris[0]
);
// Generate the url that will be used for authorization
this.authorizeUrl = client.generateAuthUrl({
	access_type: "offline",
	prompt: "consent",
	scope: scopes
});
// Open an http server to accept the oauth callback. In this
// simple example, the only request to our webserver is to
// /oauth2callback?code=<code>
const app = express();
app.get("/", (req, res) => {
	sheets.authenticate(client,req,res);
});
app.listen(3000, () => {
	// open the browser to the authorize url to start the workflow
	opn(this.authorizeUrl, { wait: false });
});
