const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");

/**
 * Test case for the /twitter endpoint.
 * Tests whether it returns no error and body has an array usernames as property
 */
describe("Twitter endpoint", () => {
	it("GET /twitter should return a json with all the users in the db", async (done) => {
		expect.assertions(4);
		const res = await request(app).get("/twitter").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);
		expect(res.body).toHaveProperty("usernames");
		expect(res.body.usernames).toBeInstanceOf(Array);

		done();
	});
});
