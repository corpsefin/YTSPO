const express = require("express");
const router = express.Router();
const spotify = require("../controllers/spotifyController");
const youtube = require("../controllers/youtubeController");

router.get("/", async (req, res) => {
    try {
        await spotify.checkTokenExpiration(req, res);
        const profile = await spotify.getProfile(req, res);
        const playlists = await spotify.getPlaylists(req, res);
        const ytProfile = req.cookies.ytToken ? await youtube.getProfile(req.cookies.ytToken.access_token) : null;

        res.render("index", { req, profile, ytProfile, playlists });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
});

router.get("/spotify-logout", (req, res) => {
    try {
        res.clearCookie("spotifyToken");
        res.redirect("/");
    } catch (err) {
        res.status(500).json({ error: "an error occurred while logging out" });
    }
});

router.post("/spotify-tracks", async (req, res) => {
    try {
        const { trackValue } = req.body;
        const { access_token } = req.cookies.ytToken;

        const { tracks } = await spotify.getTracks(req, res);
        const playlistData = JSON.parse(trackValue);

        const playlists = await youtube.getPlaylists(req, res);
        const existingPlaylist = playlists.find((playlist) => playlist.snippet.title === playlistData.name);

        if (!existingPlaylist) {
            const createdPlaylist = await youtube.createPlaylist(req, res, playlistData);
            console.log(`Created playlist: ${createdPlaylist.snippet.title}`);

            for (const track of tracks.items) {
                const video = await youtube.searchMusicVideo(track);
                await youtube.addToPlaylist(access_token, video, createdPlaylist.id);
            }

            console.log(`${createdPlaylist.snippet.title} created and songs added`);
        } else {
            for (const track of tracks.items) {
                const video = await youtube.searchMusicVideo(track);
                await youtube.addToPlaylist(access_token, video, existingPlaylist.id);
            }

            console.log(`${existingPlaylist.snippet.title} updated`);
        }

        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
});

router.get("/youtube-logout", (req, res) => {
    try {
        res.clearCookie("ytToken");
        res.redirect("/");
    } catch (err) {
        res.status(500).json({ error: "an error occurred while logging out" });
    }
});

module.exports = router;
