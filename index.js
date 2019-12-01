const express = require('express');
const handlebars = require('express-handlebars');
const network = require('./network');
const cookieParser = require('cookie-parser');
const path = require('path');
const randomatic = require('randomatic');
const mongoose = require('mongoose');
const moment = require('moment');
const signale = require('signale');
const app = express();
const hbs = handlebars.create();

const config = require('./config.json');
const models = require('./models');
const port = process.env.PORT || 8080;
app.use('/css', express.static('./views/css'))
app.use('/img', express.static('./views/img'))
app.use(cookieParser());
app.engine('hbs', hbs.engine);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
signale.start('Connecting to DB...');
mongoose.connect(config.dbUrl, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false}, () => {
	signale.complete('Connected to database!')
	app.listen(port, () => {
		signale.success(`Listening on port ${port}`);
	});
});

app.get('/', async (req, res) => {
	const state = req.query.state || req.cookies.state;
	try {
		if(!state) throw { error: 'No state token present.', redirect: config.hostname + '/login'};
		const doc = await models.State.findOne({ state });
		// signale.info(doc);
		if(!doc || !doc.accessToken || !doc.refreshToken) throw { error: 'No data in database.', redirect: config.hostname + '/login'};
		// res.send('Hello World!');
		const apiRes = await network.get('https://api.spotify.com/v1/me/playlists', authHeader(doc.tokenType + ' ' + doc.accessToken));
		res.send(apiRes.body);
	} catch (e) {
		// if(typeof e === 'object') e = JSON.parse(e);
		if(e.body && e.body.error.status == 401 && e.body.error.message === 'The access token expired') return res.redirect(config.hostname + '/refresh')
		signale.error(e.error || e);
		if(e.redirect) return res.redirect(e.redirect);
		res.send('An error occured');
	}
});

app.get('/callback', async (req, res) => {
	// signale.info(req.query);
	const state = req.query.state || req.cookies.state;
	if(req.query.error || !state) return res.send(`Error: ${state ? req.query.error : 'State token missing.'}`);
	const authToken = req.query.code;
	if(!authToken) return res.redirect(config.hostname + '/login')
	const url = 'https://accounts.spotify.com/api/token';
	const grant = 'authorization_code';
	// check for existing access token and refresh token
	try {
		// get access and refresh token
		const headers = { 'Authorization': 'Basic ' + Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64'), 'content-type' : 'application/x-www-form-urlencoded' };
		// signale.log(headers);
		const postBody = `grant_type=${grant}&redirect_uri=${config.hostname + '/callback'}&code=${authToken}`;
		const body = JSON.parse(await network.post(url, {body: postBody}, headers));
		// signale.log(body, state);
		await models.State.findOneAndUpdate({ state }, { accessToken: body.access_token, refreshToken: body.refresh_token, tokenType: body.token_type, scope: body.scope, expiresAt: moment().add(body.expires_in, 's').format() });
		// res.send('Redirecting...');
		return res.redirect(config.hostname);
	} catch(e) {
		signale.error(e);
		if(typeof e === 'object') {
			const body = JSON.parse(e.body);
			return res.send('Error: ' + body.error_description + '\n Please proceed to the homepage.');
		}
		return res.send('An error occured.');
	}
});

app.get('/refresh', async (req, res) => {
	const state = req.query.state || req.cookies.state;
	const returnUrl = req.query.return || '';
	const callbackUrl = req.query.callback || config.hostname;
	if(!state) return res.send('Error: State token missing.');
	const url = 'https://accounts.spotify.com/api/token';
	const grant = 'refresh_token';
	try {
		const doc = await models.State.findOne({state});
		if(!doc || !doc.accessToken || !doc.refreshToken) return res.redirect(config.hostname + '/login');
		const headers = { 'Authorization': 'Basic ' + Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64'), 'content-type' : 'application/x-www-form-urlencoded' };
		const postBody = `grant_type=${grant}${'&refresh_token=' + doc.refreshToken}`;
		const body = JSON.parse(await network.post(url, {body: postBody}, headers));
		await models.State.findOneAndUpdate({ state }, { accessToken: body.access_token, scope: body.scope, tokenType: body.token_type, expiresAt: moment().add(body.expires_in, 's').format() });
		signale.info('Refreshed token for: ' + state);
		res.redirect(config.hostname + returnUrl);
	} catch(e) {
		res.send('false');
	}
	
});

app.get('/login', async (req, res) => {
	var state = req.cookies.state || null;
	// signale.debug(state);
	if(!state) {
		// set unique cookie
		state = randomatic('Aa0', 10);
		res.cookie('state', state, { maxAge: 1000 * 60 * 60 * 24});
		await new models.State({ state }).save(err => err ? signale.error(err) : null);
		signale.info(`Saved ${state} to db`);
	}
	res.render('login', {
		text: 'Login With Spotify!',
		title: 'Login - Spotify Auth',
		css: 'login.css',
		redirectUrl: urlConstructor('user-read-private user-read-email', state)
	});
	// res.redirect(urlConstructor('user-read-private user-read-email', state));
});

function urlConstructor(scopes, state) {
	return 'https://accounts.spotify.com/authorize' + '?show_dialog=' + 'true' + '&response_type=code' + '&client_id=' + config.clientId + (scopes ? '&scope=' + encodeURIComponent(scopes) : '') + '&redirect_uri=' + encodeURIComponent(config.callbackUrl) + '&state=' + state;
}

function authHeader(value) {
	return { Authorization: value };
}
