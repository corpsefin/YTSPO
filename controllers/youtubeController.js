const { google } = require("googleapis");
const redirectUrl = "http://localhost:5500/auth/youtube/callback";
const axios = require("axios");
const youtubeApiKey = process.env.YOUTUBE_API_KEY;
const scopes = ["https://www.googleapis.com/auth/youtube"];
const tokenService = require("../services/tokenService");
const oauth2Client = new google.auth.OAuth2(process.env.YOUTUBE_CLIENTID, process.env.YOUTUBE_CLIENTSECRET, redirectUrl);

const login = (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "online",
        scope: scopes,
    });

    res.redirect(url);
};

const getTokens = async (req, res) => {
    try {
        const code = req.query.code;
        const { tokens } = await oauth2Client.getToken(code);
        const { access_token, refresh_token, expiry_date } = tokens;

        console.log(Date(expiry_date));
        res.cookie(
            "ytToken",
            {
                access_token,
                expiry_date,
            },
            {
                secure: false,
                httpOnly: true,
                maxAge: expiry_date * 1000,
            }
        );
        const date = new Date(Date.now() + expiry_date * 1000);
        const user = await getProfile(access_token);

        const ytToken = {
            username: user.title,
            accessToken: access_token,
            refreshToken: refresh_token || null,
            service: "youtube",
            expiration: date.toString(),
        };

        const tokenObject = await tokenService.checkIfTokenExists(user.title, ytToken.service);

        if (!tokenObject) await tokenService.createToken(ytToken);

        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.json(error);
    }
};

//Make a cache storage
const getProfile = async (token) => {
    try {
        if (!token || Date.parse(token.expiry_date) < Date.now()) {
            //Refresh token
            return;
        }
        const response = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
            params: {
                part: "snippet, contentDetails",
                mine: true,
            },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        // res.cookie("ytProfile", response.data.items[0].snippet, {
        //     secure: false,
        //     httpOnly: true,
        //     maxAge: 3600000,
        // });

        return response.data.items[0].snippet;
    } catch (error) {
        console.log(error);
    }
};

const searchMusicVideo = async (track) => {
    try {
        const apiKey = youtubeApiKey; // Replace with your API key
        const artistName = `"topic" ${track.track.artists[0].name} - ${track.track.name}`;
        const url = `https://www.googleapis.com/youtube/v3/search?order=relevance&part=snippet&maxResults=50&q=${encodeURIComponent(artistName)}&key=${apiKey}`;

        const response = await axios.get(url);
        const items = response.data.items;
        // Send the videoData to the client or handle it as needed
        const videoItems = items.filter((video) => {
            return video.id.kind === "youtube#video";
        });

        return videoItems[0];
    } catch (error) {
        console.error("Error getting the track ", error.message);
    }
};

const getPlaylists = async (req) => {
    try {
        const response = await axios.get("https://www.googleapis.com/youtube/v3/playlists", {
            params: {
                part: "snippet",
                mine: true,
            },
            headers: {
                Authorization: `Bearer ${req.cookies.ytToken.access_token}`,
            },
        });

        return response.data.items;
    } catch (error) {
        console.log(error.message);
    }
};

const createPlaylist = async (req, res, playlist) => {
    try {
        const url = `https://www.googleapis.com/youtube/v3/playlists`;
        const newPlaylist = await axios.post(
            url,
            {
                snippet: {
                    title: playlist.name,
                    description: playlist.description,
                },
            },
            {
                params: {
                    part: "snippet, id",
                },
                headers: {
                    Authorization: `Bearer ${req.cookies.ytToken.access_token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        );

        //console.log(`newplaylist: ${newPlaylist.snippet.title}`)

        return newPlaylist.data;
    } catch (error) {
        console.error(`Create Playlist error: ${error.message}`);
    }
};

const addToPlaylist = async (token, video, playlistId) => {
    try {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
        const track = await axios.post(
            url,
            {
                snippet: {
                    playlistId: playlistId,
                    resourceId: {
                        kind: "youtube#video",
                        videoId: video.id.videoId,
                    },
                },
            },
            {
                params: {
                    part: "snippet",
                    key: youtubeApiKey,
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        );
        console.log(`${video.snippet.title} added`);
    } catch (error) {
        console.log(`Adding to playlist error: ${error.message}`);
    }
};

module.exports = {
    searchMusicVideo,
    login,
    getTokens,
    getPlaylists,
    createPlaylist,
    addToPlaylist,
    getProfile,
};
