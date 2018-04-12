const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");
const facebookAccount = require("../models/facebook.model");
const facebookStub = require("./facebook.stub.json").facebook;

beforeAll(async () => {
	await facebookAccount.collection.insert(facebookStub);
});

/**
 * Possibility of all tests accessing the same server
 */
afterAll(async () => {
	await facebookAccount.collection.drop();
});

/**
 * Test case for the /facebook, and derived pages, endpoint.
 * Tests behavior of sad path for now.
*/
describe("# GET /facebook", () => {
	let nameTest;

	// When required, access should be granted
	it("should to have access: index; and return a JSON with all the users in the db", async (done) => {
		const res = await request(app).get("/facebook").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("results");
		expect(res.body.results).toBeInstanceOf(Array);
		expect(res.body.results.length).toEqual(facebookStub.length);

		nameTest = res.body.results[0].name;

		done();
	});

	// When required, access should be granted
	it("should to have access: likesProgress; and return a image", async (done) => {
		expect(nameTest).toBeDefined();

		const res = await request(app).get(`/facebook/${nameTest}/likes`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});
});
