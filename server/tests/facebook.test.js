const request = require("supertest");
const httpStatus = require("http-status");
const app = require("../../index");
const server = require("../../index").server;

/**
 * Possibility of all tests accessing the same server
 */
afterAll((done) => {
	server.close();
	done();
});

/**
 * Test case for the /facebook, and derived pages, endpoint.
 * Tests behavior of sad path for now.
*/
describe("# GET /facebook", () => {
	// When required, access should be granted
	it("should to have access: index", (done) => {
		request(app)
			.get("/facebook")
			.expect(httpStatus.OK)
			.then(() => {
				done();
			})
			.catch(done);
	});

	// When required, access should be granted
	it("should to have access: find", (done) => {
		request(app)
			.get("/facebook/find")
			.expect(httpStatus.FOUND)
			.then(() => {
				done();
			})
			.catch(done);
	});

	// When required, access should be granted
	it("should to have access: tstInsertion", (done) => {
		request(app)
			.get("/facebook/tstInsertion")
			.expect(httpStatus.FOUND)
			.then(() => {
				done();
			})
			.catch(done);
	});
});
