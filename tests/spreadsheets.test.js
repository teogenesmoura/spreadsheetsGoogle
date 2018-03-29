const spreadsheets = require("../controllers/spreadsheets");
const fs = require("fs");
/**
 * Test case for the 'generateCharts' method. It loads a mock collectives.json file (In the time of
 * writing the file reflects the current state of the spreadsheet) and tests whether a chart is
 * saved to the disk or not.
 */
describe("generateCharts method", () => {
	it("frentePopularInstagram chart should be created", async (done) => {
		// loads json file containing the values of a spreadsheet
		const collectives = JSON.parse(fs.readFileSync("./tests/spreadsheets-collectives.json"));

		// generates the chart from the existent file
		await spreadsheets.generateCharts(collectives)
		// loads the created image
		const newImage = fs.readFileSync("./controllers/frentePopularInstagram.png");
		// loads the pre-existing correct image
		const oldImage = fs.readFileSync("./tests/spreadsheets-instagram-chart.png");

		expect(newImage).toEqual(oldImage); // images have to be the same
		expect(newImage).toBeInstanceOf(Buffer);
		done();
	});
});
