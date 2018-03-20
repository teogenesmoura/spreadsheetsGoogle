"use strict";
const spreadsheets = require("./controllers/spreadsheets");
const fs = require("fs");
/**
 * Test case for the 'generateCharts' method. It loads a mock collectives.json file (In the time of writing the file reflects
 * the current state of the spreadsheet) and tests whether a chart is saved to the disk or not.
 */
it("frentePopularInstagram chart should exist on disk", () => {
	expect.assertions(1);
	var collectives = JSON.parse(fs.readFileSync("./collectives.json"));
	return spreadsheets.generateCharts(collectives)
		.then(expect(fs.readFileSync("./controllers/frentePopularInstagram.png")).toBeInstanceOf(Buffer));
});