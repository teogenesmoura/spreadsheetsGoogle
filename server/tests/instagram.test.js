const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");

/**
 * Tests if instagram endpoint can be reached
 */

describe("GET /instagram", () => {
	it("test the index of /instagram", (done) => {
		request(app)
			.get("/instagram")
			.expect(httpStatus.OK)
			.then(() => {
				done();
			})
			.catch(done);
	});
});
