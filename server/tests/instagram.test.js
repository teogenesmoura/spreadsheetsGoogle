const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");
const instagramAccountModel = require("../models/instagram.model");
const instagramStub = require("./instagram-stub.json").instagram;
//	const mongoose = require("mongoose");

/**
 * Tests if instagram endpoint can be reached
 */

beforeAll(async () => {
	await instagramAccountModel.collection.insert(instagramStub);
});

afterAll(async () => {
	await instagramAccountModel.collection.drop();
	// await mongoose.disconnect();
	// await app.close();
});

describe("GET /instagram", () => {
	let usernameTest;

	it("should reach /instagram/", async (done) => {
		const res = await request(app).get("/instagram").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("usernames");
		expect(res.body.usernames).toBeInstanceOf(Array);
		expect(res.body.usernames.length).toEqual(instagramStub.length);

		usernameTest = res.body.usernames[0].username;

		done();
	});

	it("should access /instagram/:username and return a JSON with all data", async (done) => {
		const res = await request(app).get(`/instagram/${usernameTest}`).expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("usernames");
		expect(res.body.usernames).toBeInstanceOf(Object);
		expect(res.body.usernames.name).toEqual("Jorge da Silva");
		expect(res.body.usernames.username).toEqual("foo");
		expect(res.body.usernames.history.length).toEqual(3);

		expect(res.body.usernames.history[0].date).toEqual("2018-04-01T12:30:00.500Z");
		expect(res.body.usernames.history[0].followers).toEqual(10);
		expect(res.body.usernames.history[0].following).toEqual(1);
		expect(res.body.usernames.history[0].num_of_posts).toEqual(10);

		expect(res.body.usernames.history[1].date).toEqual("2018-04-05T12:30:00.505Z");
		expect(res.body.usernames.history[1].followers).toEqual(15);
		expect(res.body.usernames.history[1].following).toEqual(6);
		expect(res.body.usernames.history[1].num_of_posts).toEqual(15);

		expect(res.body.usernames.history[2].date).toEqual(null);
		expect(res.body.usernames.history[2].followers).toEqual(12);
		expect(res.body.usernames.history[2].following).toEqual(8);
		expect(res.body.usernames.history[2].num_of_posts).toEqual(17);

		done();
	});

	it("should access /instagram/latest/:username and return a JSON with the latest data", async (done) => {
		const res = await request(app).get(`/instagram/latest/${usernameTest}`).expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("results");
		expect(res.body.results).toBeInstanceOf(Object);
		expect(res.body.results.followers).toEqual(12);
		expect(res.body.results.following).toEqual(8);
		expect(res.body.results.num_of_posts).toEqual(17);

		done();
	});

	it("should access /instagram/:username/followers and return an image (the graph)", async (done) => {
		expect(usernameTest).toBeDefined();

		const res = await request(app).get(`/instagram/${usernameTest}/followers`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/:username/following and return an image (the graph)", async (done) => {
		expect(usernameTest).toBeDefined();

		const res = await request(app).get(`/instagram/${usernameTest}/following`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/:username/post and return an image (the graph)", async (done) => {
		expect(usernameTest).toBeDefined();

		const res = await request(app).get(`/instagram/${usernameTest}/posts`).expect(httpStatus.OK);

		expect(res.header["content-type"]).toEqual("image/png");

		done();
	});

	it("should access /instagram/:username/likes and return an image (the graph)", async (done) => {
		expect(usernameTest).toBeDefined();

		await request(app).get(`/instagram/${usernameTest}/likes`).expect(httpStatus.NOT_FOUND);

		done();
	});
});
