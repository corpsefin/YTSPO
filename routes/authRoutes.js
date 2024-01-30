const express = require("express");
const router = express.Router();
const spotifyController = require("../controllers/spotifyController");
const youtubeController = require("../controllers/youtubeController");

router.route("/spotify/login").get(spotifyController.login);
router.route("/spotify/callback").get(spotifyController.callback);
//router.route("/spotify/refresh_token").get(spotifyController.refreshToken);
router.route("/youtube/login").get(youtubeController.login);
router.route("/youtube/callback").get(youtubeController.getTokens);

module.exports = router;
