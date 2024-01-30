require("dotenv").config();
const axios = require("axios");
const tokenService = require("../services/tokenService");
const SPOTIFY_AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const REDIRECT_URI = "http://localhost:5500/auth/spotify/callback";
const SCOPES = "playlist-read-private user-library-modify user-read-email";
const clientId = process.env.SPOTIFY_CLIENTID;
const clientSecret = process.env.SPOTIFY_CLIENTSECRET;

const getAuthHeader = (req) => {
    if (!req.cookies.spotifyToken) {
        throw new Error("No token found");
    }

    const accessToken = JSON.parse(req.cookies.spotifyToken).accessToken;
    return {
        Authorization: `Bearer ${accessToken}`,
    };
};

const login = (req, res) =>
    res.redirect(`${SPOTIFY_AUTH_ENDPOINT}?client_id=${clientId}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}&show_dialog=true`);

// Get authorization options for Spotify using authorization code
const getAuthCode = (req) => {
    const code = req.query.code;
    const authOptions = {
        url: SPOTIFY_TOKEN_ENDPOINT,
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: `grant_type=authorization_code&code=${code}&redirect_uri=${REDIRECT_URI}`,
    };
    return authOptions;
};

// Get Spotify access token using authorization code
const getTokens = async (req) => {
    try {
        const authOptions = getAuthCode(req);
        const result = await axios(authOptions);
        return result.data;
    } catch (error) {
        console.error(`Get Tokens error: ${error.message}`);
    }
};

//Get Spotify access token using refresh token
const refreshAccessToken = async (refreshToken) => {
    try {
        const authOptions = {
            url: SPOTIFY_TOKEN_ENDPOINT,
            method: "post",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            },
            data: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
            json: true,
        };

        const result = await axios(authOptions);
        return result.data;
    } catch (error) {
        console.error(`Refresh token error: ${error.message}`);
    }
};

//Callback function for handling Spotify authentication.
const callback = async (req, res) => {
    try {
        const tokens = await getTokens(req);
        const { access_token, refresh_token, expires_in } = tokens;
        const profile = await axios.get("https://api.spotify.com/v1/me", {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const date = new Date(Date.now() + expires_in * 1000);
        const token = {
            username: profile.data.id,
            accessToken: access_token,
            refreshToken: refresh_token,
            service: "spotify",
            expiration: date.toString(),
        };

        const tokenObject = await tokenService.checkIfTokenExists(token.username, token.service);
        if (!tokenObject) await tokenService.createToken(token);

        res.cookie(
            "spotifyToken",
            JSON.stringify({
                accessToken: access_token,
                username: profile.data.id,
                service: token.service,
                expiration: token.expiration,
            }),
            {
                secure: false,
                httpOnly: true,
                maxAge: expires_in * 1000,
            }
        );

        res.redirect("/");
    } catch (error) {
        console.error("Error:", error.message);
        // Handle the error and send an appropriate response
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Checks if the Spotify token has expired and refreshes it if necessary.
const checkTokenExpiration = async (req, res) => {
    try {
        if (!req.cookies.spotifyToken) return;

        const spotifyToken = JSON.parse(req.cookies.spotifyToken);
        const username = spotifyToken.username;
        const service = spotifyToken.service;
        const expiration = new Date(spotifyToken.expiration); // Parse the expiration as a Date object
        const accessToken = spotifyToken.accessToken;

        const tokenObject = await tokenService.checkIfTokenExists(username, service);

        if (tokenObject) {
            console.log(`Token expires: ${tokenObject.expiration}`);
            if (Date.now() > tokenObject.expiration) {
                const newToken = await refreshAccessToken(tokenObject.refreshToken);
                const date = new Date(Date.now() + newToken.expires_in * 1000);
                const token = {
                    username: tokenObject.username,
                    accessToken: newToken.access_token,
                    refreshToken: tokenObject.refreshToken,
                    service: tokenObject.service,
                    expiration: date.toString(),
                };
                await tokenService.updateToken(tokenObject.id, token);
            }
        }
    } catch (error) {
        res.status(500).json({ error: "error checking the token: " + error.message });
    }
};

// Get users profile
const getProfile = async (req, res) => {
    try {
        if (!req.cookies.spotifyToken) return;

        const headers = getAuthHeader(req);
        const profile = await axios.get("https://api.spotify.com/v1/me", { headers });

        return profile.data;
    } catch (error) {
        res.status(500).json({ error: "Error getting the profile: " + error.message });
    }
};

// Get user's Spotify playlists
const getPlaylists = async (req, res) => {
    try {
        if (!req.cookies.spotifyToken) return;
        const headers = getAuthHeader(req);
        const playlists = await axios.get(`https://api.spotify.com/v1/me/playlists?limit=50`, { headers });

        return playlists.data.items;
    } catch (error) {
        res.status(500).json({ error: "an error occurred while getting the playlists" });
    }
};

// Get items in a Spotify playlist
const getTracks = async (req, res) => {
    try {
        const headers = getAuthHeader(req);
        const id = JSON.parse(req.body.trackValue).id;
        const playlistItems = await axios.get(`https://api.spotify.com/v1/playlists/${id}`, { headers });

        return playlistItems.data;
    } catch (error) {
        console.error(error.message);
    }
};

// Get details of a Spotify track
const getTrack = async (id) => {
    const headers = getAuthHeader(req);
    const result = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, { headers });

    return result.data.track;
};
module.exports = {
    login,
    callback,
    //refreshToken,
    getProfile,
    getPlaylists,
    getTracks,
    checkTokenExpiration,
};
