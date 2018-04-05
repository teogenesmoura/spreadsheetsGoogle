const spreadsheets = require("../controllers/spreadsheets");
const fs = require("fs");
/**
 * Test case for the 'generateCharts' method. It loads a mock collectives.json file (In the time of
 * writing the file reflects the current state of the spreadsheet) and tests whether a chart is
 * saved to the disk or not.
 */

describe("generateCharts method", () => {
	it("frentePopularInstagram chart should be created", async (done) => {
		const collectives = JSON.parse(fs.readFileSync("./tests/spreadsheets-collectives.json"));

		// if image already exists, delete it so we can test its creation
		if (fs.existsSync("./controllers/" + spreadsheets.fileName)) {
			fs.unlinkSync("./controllers/" + spreadsheets.fileName);
		}

		// creates chart and writes it to a png file
		await spreadsheets.generateCharts(collectives);

		// loads the created image
		const newImage = fs.readFileSync("./controllers/" + spreadsheets.fileName);
		expect(newImage).toBeInstanceOf(Buffer);

		done();
	});
});
