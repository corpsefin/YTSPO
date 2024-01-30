const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Schema = mongoose.Schema;
const TokenSchema = new Schema({
    username: String,
    accessToken: String,
    refreshToken: String,
    service: String,
    expiration: Date,
});

module.exports = mongoose.model("Token", TokenSchema);
