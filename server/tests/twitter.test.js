const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");
const twitterAccount = require("../models/twitter.model");
const twitterMockAccounts = require("./twitter-stub-accounts.json").accounts;
const twitterCtrl = require("../controllers/twitter.controller");

beforeAll(async (done) => {
	await twitterAccount.insertMany(twitterMockAccounts);
	done();
});

afterAll(async (done) => {
	await twitterAccount.deleteMany();
	done();
});

/**
 * Test case for the /twitter endpoint.
 * Tests whether it returns no error and body has an array usernames as property
 */
describe("Twitter endpoint", () => {
	let usernameTest1;
	let usernameTest2;

	it("GET /twitter should return a json with all the users in the db", async (done) => {
		const res = await request(app).get("/twitter").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);
		expect(res.body).toHaveProperty("accounts");
		expect(res.body.accounts).toBeInstanceOf(Array);
		expect(res.body.accounts.length).toEqual(twitterMockAccounts.length);
		usernameTest1 = res.body.accounts[0].username;
		usernameTest2 = res.body.accounts[1].username;
		done();
	});

	it("GET /twitter/:username should return a json with user information", async (done) => {
		const res = await request(app).get("/twitter/john").expect(httpStatus.OK);
		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);
		expect(res.body).toHaveProperty("account");
		expect(res.body.account).toHaveProperty("links");
		expect(res.body.account.links.length).toEqual(6);
		expect(res.body.account.username).toEqual("john");
		expect(res.body.account.name).toEqual("Joao");
		expect(res.body.account.type).toEqual("Presidente");
		expect(res.body.account.samples).toBeInstanceOf(Array);
		done();
	});

	it("GET /twitter/latest/:username should return json with latest user information", async (done) => {
		const res = await request(app).get("/twitter/latest/john").expect(httpStatus.OK);
		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);
		expect(res.body).toHaveProperty("latest");
		expect(res.body.latest).toEqual({
			tweets: 323,
			likes: 621,
			followers: 855,
			following: 30,
			moments: 11,
		});
		done();
	});

	it("GET /twitter/:username/likes should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		const res = await request(app).get(`/twitter/${usernameTest1}/likes`).expect(httpStatus.OK);
		expect(res.header["content-type"]).toEqual("image/png");
		done();
	});

	it("GET /twitter/:username/tweets should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		const res = await request(app).get(`/twitter/${usernameTest1}/tweets`).expect(httpStatus.OK);
		expect(res.header["content-type"]).toEqual("image/png");
		done();
	});

	it("GET /twitter/:username/followers should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		const res = await request(app).get(`/twitter/${usernameTest1}/followers`).expect(httpStatus.OK);
		expect(res.header["content-type"]).toEqual("image/png");
		done();
	});

	it("GET /twitter/:username/following should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		const res = await request(app).get(`/twitter/${usernameTest1}/following`).expect(httpStatus.OK);
		expect(res.header["content-type"]).toEqual("image/png");
		done();
	});

	it("GET /twitter/:username/moments should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		const res = await request(app).get(`/twitter/${usernameTest1}/moments`).expect(httpStatus.OK);
		expect(res.header["content-type"]).toEqual("image/png");
		done();
	});

	it("GET /twitter/compare/likes?actors={:id} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		const res = await request(app).get(`/twitter/compare/likes?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("GET /twitter/compare/tweets?actors={:id} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		const res = await request(app).get(`/twitter/compare/tweets?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("GET /twitter/compare/followers?actors={:id} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		const res = await request(app).get(`/twitter/compare/followers?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("GET /twitter/compare/following?actors={:id} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		const res = await request(app).get(`/twitter/compare/following?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("GET /twitter/compare/moments?actors={:id} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		const res = await request(app).get(`/twitter/compare/moments?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});
});

describe("Twitter methods", () => {
	const param = "qualquer coisa";

	it("Recovery of evolution message", async (done) => {
		const result = "Evolução de qualquer coisa, no Twitter";
		const delivery = twitterCtrl.evolutionMsg(param);

		expect(delivery).toEqual(result);

		done();
	});

	it("Recovery of a string capitalized", async (done) => {
		const result = "Qualquer Coisa";
		const param1 = "qualquercoisa";
		const result1 = "Qualquercoisa";
		const delivery = twitterCtrl.capitalize(param);
		const delivery1 = twitterCtrl.capitalize(param1);

		expect(delivery).toEqual(result);
		expect(delivery1).toEqual(result1);

		done();
	});
});
