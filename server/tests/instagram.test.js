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
	let nameTest;

	it("should reach /instagram/", async (done) => {
		const res = await request(app).get("/instagram").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("usernames");
		expect(res.body.usernames).toBeInstanceOf(Array);
		expect(res.body.usernames.length).toEqual(instagramStub.length);
		nameTest = res.body.usernames[0].name;

		done();
	});
	it("should access /instagram/:name", async (done) => {
		const res = await request(app).get(`/instagram/${nameTest}`).expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("usernames");
		expect(res.body.usernames).toBeInstanceOf(Object);
		expect(res.body.usernames.name).toEqual("Jorge da Silva");
		expect(res.body.usernames.link).toEqual("http://instagram.com/foo");
		expect(res.body.usernames.history.length).toEqual(3);

		expect(res.body.usernames.history[0].date).toEqual("2018-04-01T12:30:00.500Z");
		expect(res.body.usernames.history[0].followers).toEqual("10");
		expect(res.body.usernames.history[0].following).toEqual("1");
		expect(res.body.usernames.history[0].num_of_posts).toEqual("10");

		expect(res.body.usernames.history[1].date).toEqual("2018-04-05T12:30:00.505Z");
		expect(res.body.usernames.history[1].followers).toEqual("15");
		expect(res.body.usernames.history[1].following).toEqual("6");
		expect(res.body.usernames.history[1].num_of_posts).toEqual("15");

		expect(res.body.usernames.history[2].date).toEqual("");
		expect(res.body.usernames.history[2].followers).toEqual("12");
		expect(res.body.usernames.history[2].folloswing).toEqual("8");
		expect(res.body.usernames.history[2].num_of_posts).toEqual("15");

		done();
	});
	it("should return data from /instagram/", async (done) => {
		expect(nameTest).toBeDefined();

		// const res = await request(app).get("/instagram/all").expect(httpStatus.OK);

		done();
	});
});
