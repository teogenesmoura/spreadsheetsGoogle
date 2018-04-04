const fs = require("fs");
const request = require("supertest-as-promised");
const httpStatus = require("http-status");
const spreadsheets = require("../controllers/spreadsheets.controller");
const app = require("../../index");

/**
 * Test case for the /spreadsheets endpoint. Tests behavior of sad path for now
 */
describe("# GET /spreadsheets", () => {
	// When there isn't a code parameter, it should redirect to google auth
	it("should redirect without code query parameter", (done) => {
		request(app)
			.get("/spreadsheets")
			.expect(httpStatus.FOUND) // 302 redirect code
			.then(() => {
				done();
			})
			.catch(done);
	});

	// When there is a code, it queries Google to get credentials, it takes >1s
	// and it will timeout when there is a bad or no internet connection
	it("should return server error with invalid code query", (done) => {
		request(app)
			.get("/spreadsheets?code=xxxxx")
			.expect(httpStatus.INTERNAL_SERVER_ERROR) // 302 redirect code
			.then(() => {
				done();
			})
			.catch(done);
	});
});

/**
 * Test case for the 'generateCharts' method. It loads a mock collectives.json file (In the time of
 * writing the file reflects the current state of the spreadsheet) and tests whether a chart is
 * saved to the disk or not.
 */
describe("# generateCharts method", () => {
	it("frentePopularInstagram chart should be created", async (done) => {
		const collectives = JSON.parse(fs.readFileSync("./server/tests/spreadsheets-collectives.json"));

		// if image already exists, delete it so we can test its creation
		if (fs.existsSync("./server/controllers/frentePopularInstagram.png")) {
			fs.unlinkSync("./server/controllers/frentePopularInstagram.png");
		}

		// creates chart and writes it to a png file
		await spreadsheets.generateCharts(collectives);

		// loads the created image
		const newImage = fs.readFileSync("./server/controllers/frentePopularInstagram.png");
		expect(newImage).toBeInstanceOf(Buffer);

		done();
	});
});
