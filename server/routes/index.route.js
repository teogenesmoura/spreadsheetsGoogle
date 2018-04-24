const express = require("express");
const spreadsheetsRoute = require("./spreadsheets.route");
const instagramRoute = require("./instagram.route");
const twitterRoute = require("./twitter.route");
const facebookRoute = require("./facebook.route");
const youtubeRoute = require("./youtube.route");

const router = express.Router();

router.use("/", spreadsheetsRoute);

// mount facebook routes at /facebook
router.use("/facebook", facebookRoute);

// mount twitter routes at /twitter
router.use("/twitter", twitterRoute);

// mount youtube routes at /youtube
router.use("/youtube", youtubeRoute);

router.use("/instagram", instagramRoute);

module.exports = router;
