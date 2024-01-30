const TokenModel = require("../models/Token");

//Add username to the token object
exports.createToken = async (token) => {
    return await TokenModel.create(token);
};

//Check if username is the same and update the token
exports.updateToken = async (id, token) => {
    return await TokenModel.findByIdAndUpdate(id, token);
};

exports.checkIfTokenExists = async (username, service) => {

    return await TokenModel.findOne({ username: username, service: service });
};

exports.deleteToken = async (id) => {
    return await TokenModel.findByIdAndRemove(id);
};
