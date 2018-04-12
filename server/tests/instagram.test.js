const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");
const instagramAccountModel = require("../models/instagram.model");
const instagramStub = require("./instagram-stub.json").instagram;

/**
 * Tests if instagram endpoint can be reached
 */

beforeAll(async () => {
	await instagramAccountModel.collection.insert(instagramStub);
});

afterAll(async () => {
	await instagramAccountModel.collection.drop();
});

describe("GET /instagram", () => {
//	let nameTest;

	it("should reach /instagram", (done) => {
		request(app)
			.get("/instagram")
			.expect(httpStatus.OK)
			.then(() => {
				done();
			})
			.catch(done);
	});
/*	it("should access /instagram/all", async (done) => {
		const res = await request(app).get("/instagram/all").expect(httpStatus.OK);

		expect(res.body).toHaveProperty("error");
		expect(res.body.error).toBe(false);

		expect(res.body).toHaveProperty("usernames");
		expect(res.body.usernames).toBeInstanceOf(Array);
//		expect(res.body.username.length).toEqual(instagramStub.length);
		nameTest = res.body.usernames[0];

		done();
	});
	it("should return data from /instagram/all", async (done) => {
		expect(nameTest).toBeDefined();

		const res = await request(app).get("/instagram/all").expect(httpStatus.OK);

		done();
	});
*/
});
