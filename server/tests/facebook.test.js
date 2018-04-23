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
describe("Facebook endpoint", () => {
	let nameTest;

	// When required, access should be granted
	it("GET /facebook should return a JSON with all the users in the db", async (done) => {
		const res = await request(app).get("/facebook").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("results");
		expect(res.body.results).toBeInstanceOf(Array);
		expect(res.body.results.length).toEqual(facebookStub.length);

		const splitLink = res.body.results[0].href.split("/");
		nameTest = splitLink[splitLink.length - 1];

		done();
	});

	// When requires, access should be granted
	it("GET /facebook/help should return the routes' guide", async (done) => {
		const res = await request(app).get("/facebook/help").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("results");
		expect(res.body.results).toBeInstanceOf(Object);

		done();
	});

	// When requires, access should be granted
	it("GET /facebook/:name should return all data from a certain user", async (done) => {
		const res = await request(app).get(`/facebook/${nameTest}`).expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("results");
		expect(res.body.results).toBeInstanceOf(Object);
		expect(res.body.results.name).toEqual("José Maria");
		expect(res.body.results.class).toEqual("joseClass");
		expect(res.body.results.link).toEqual("joseLink/jose/");
		expect(res.body.results.history.length).toEqual(3);

		expect(res.body.results.history[0].likes).toEqual(42);
		expect(res.body.results.history[0].followers).toEqual(420);
		expect(res.body.results.history[0].date).toEqual("1994-12-24T02:00:00.000Z");

		expect(res.body.results.history[1].likes).toEqual(40);
		expect(res.body.results.history[1].followers).toEqual(840);
		expect(res.body.results.history[1].date).toEqual("1995-01-24T02:00:00.000Z");

		expect(res.body.results.history[2].likes).toEqual(45);
		expect(res.body.results.history[2].followers).toEqual(1000);
		expect(res.body.results.history[2].date).toEqual("1995-02-24T02:00:00.000Z");
		done();
	});

	// When requires, access should be granted
	it("GET /facebook/error should return message error", async (done) => {
		const res = await request(app).get("/facebook/error").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("results");
		expect(res.body.results).toEqual(null);

		done();
	});

	it("GET /facebook/import shoul import all data from the spreadsheets to localBD", async (done) => {
		await request(app).get("/facebook/import").expect(httpStatus.FOUND);

		done();
	});

	// When requires, access should be granted
	it("GET /facebook/latest/:username should return the latest data from a user", async (done) => {
		const res = await request(app).get(`/facebook/latest/${nameTest}`).expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("results");
		expect(res.body.results).toBeInstanceOf(Object);

		expect(res.body.results.likes).toEqual(45);
		expect(res.body.results.followers).toEqual(1000);

		done();
	});

	// When required, access should be granted
	it("GET /facebook/:username/likes should return an image (the graph)", async (done) => {
		expect(nameTest).toBeDefined();

		const res = await request(app).get(`/facebook/${nameTest}/likes`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	// When required, access should be granted
	it("GET /facebook/:username/followers should return an image (the graph)", async (done) => {
		expect(nameTest).toBeDefined();

		const res = await request(app).get(`/facebook/${nameTest}/followers`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	// When required, access should be granted
	it("GET /facebook/:username/qualquer should return an image (the graph)", async (done) => {
		expect(nameTest).toBeDefined();

		await request(app).get(`/facebook/${nameTest}/qualquer`).expect(httpStatus.NOT_FOUND);

		done();
	});
});
