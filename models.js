const mongoose = require('mongoose');
const moment = require('moment');

const stateSchema = new mongoose.Schema({
	state: String,
	accessToken: String,
	tokenType: String,
	refreshToken: String,
	scope: String,
	expiresAt: Date,
	createdAt: { type: Date, default: () => moment().utc().format() }
});

exports.State = mongoose.model('tokens', stateSchema);