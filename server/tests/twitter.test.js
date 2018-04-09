const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");

/**
 * Test case for the /twitter endpoint. Tests behavior of sad path for now
 */
describe("Twitter endpoint", () => {
	it("GET /twitter should return a json with all the users in the db", (done) => {
		request(app)
			.get("/twitter")
			.expect(httpStatus.OK)
			.then((res) => {
				expect(res.body).toHaveProperty("error");
				expect(res.body.error).toBe(false);
				expect(res.body).toHaveProperty("usernames");
				expect(res.body.usernames).toBeInstanceOf(Array);
				expect(res.body.usernames.length).toBeGreaterThan(0);
				done();
			})
			.catch(done);
	});
});
