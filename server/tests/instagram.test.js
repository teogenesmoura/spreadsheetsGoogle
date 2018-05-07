const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");
const instagramAccountModel = require("../models/instagram.model");
const instagramStub = require("./instagram-stub.json").instagram;
const instagramCtrl = require("../controllers/instagram.controller");

/**
 * Tests if instagram endpoint can be reached
 */
beforeAll(async (done) => {
	await instagramAccountModel.insertMany(instagramStub);
	done();
});

afterAll(async (done) => {
	await instagramAccountModel.deleteMany({});
	done();
});

describe("GET /instagram", () => {
	let usernameTest1;
	let usernameTest2;

	it("should reach /instagram/", async (done) => {
		const res = await request(app).get("/instagram").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("accounts");
		expect(res.body.accounts).toBeInstanceOf(Array);
		expect(res.body.accounts.length).toEqual(instagramStub.length);

		usernameTest1 = res.body.accounts[0].username;
		usernameTest2 = res.body.accounts[1].username;

		done();
	});

	it("should access /instagram/:username and return a JSON with all data", async (done) => {
		expect(usernameTest1).toBeDefined();

		const res = await request(app).get(`/instagram/${usernameTest1}`).expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("account");
		expect(res.body.account).toBeInstanceOf(Object);
		expect(res.body.account).toHaveProperty("links");
		expect(res.body.account.links.length).toEqual(4);
		expect(res.body.account.name).toEqual("Jorge da Silva");
		expect(res.body.account.username).toEqual("foo");
		expect(res.body.account.history.length).toEqual(3);

		expect(res.body.account.history[0].date).toEqual("2018-04-01T12:30:00.500Z");
		expect(res.body.account.history[0].followers).toEqual(10);
		expect(res.body.account.history[0].following).toEqual(1);
		expect(res.body.account.history[0].num_of_posts).toEqual(10);

		expect(res.body.account.history[1].date).toEqual("2018-04-05T12:30:00.505Z");
		expect(res.body.account.history[1].followers).toEqual(15);
		expect(res.body.account.history[1].following).toEqual(6);
		expect(res.body.account.history[1].num_of_posts).toEqual(15);

		expect(res.body.account.history[2].date).toEqual("2018-04-05T12:30:00.510Z");
		expect(res.body.account.history[2].followers).toEqual(12);
		expect(res.body.account.history[2].following).toEqual(8);
		expect(res.body.account.history[2].num_of_posts).toEqual(17);

		done();
	});

	it("should access /instagram/latest/:username and return a JSON with the latest data", async (done) => {
		expect(usernameTest1).toBeDefined();

		const res = await request(app).get(`/instagram/latest/${usernameTest1}`).expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("latest");
		expect(res.body.latest).toBeInstanceOf(Object);
		expect(res.body.latest.followers).toEqual(12);
		expect(res.body.latest.following).toEqual(8);
		expect(res.body.latest.num_of_posts).toEqual(17);

		done();
	});

	it("should access /instagram/:username/followers and return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();

		const res = await request(app).get(`/instagram/${usernameTest1}/followers`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/:username/following and return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();

		const res = await request(app).get(`/instagram/${usernameTest1}/following`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/:username/num_of_posts and return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();

		const res = await request(app).get(`/instagram/${usernameTest1}/num_of_posts`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/:username/likes and return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();

		await request(app).get(`/instagram/${usernameTest1}/likes`).expect(httpStatus.NOT_FOUND);

		done();
	});

	it("should access /instagram/compare/followers?actors={:usermane} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		const res = await request(app).get(`/instagram/compare/followers?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/compare/following?actors={:usermane} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		const res = await request(app).get(`/instagram/compare/following?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/compare/num_of_posts?actors={:usermane} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		const res = await request(app).get(`/instagram/compare/num_of_posts?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/compare/likes?actors={:usermane} should return an image (the graph)", async (done) => {
		expect(usernameTest1).toBeDefined();
		expect(usernameTest2).toBeDefined();

		await request(app).get(`/instagram/compare/likes?actors=${usernameTest1},${usernameTest2}`).expect(httpStatus.NOT_FOUND);

		done();
	});
});

describe("Instagram methods", () => {
	const param = "qualquer coisa";

	it("Recovery of evolution message", async (done) => {
		const result = "Evolução de qualquer coisa, no Instagram";
		const delivery = instagramCtrl.evolutionMsg(param);

		expect(delivery).toEqual(result);

		done();
	});

	it("Recovery of a string capitalized", async (done) => {
		const result = "Qualquer Coisa";
		const param1 = "qualquercoisa";
		const result1 = "Qualquercoisa";
		const delivery = instagramCtrl.capitalize(param);
		const delivery1 = instagramCtrl.capitalize(param1);

		expect(delivery).toEqual(result);
		expect(delivery1).toEqual(result1);

		done();
	});
});
