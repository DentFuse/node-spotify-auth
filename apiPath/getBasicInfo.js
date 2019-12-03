const models = require('./../models');
const network = require('./../network');
const utils = require('./../utils');
const config = require('./../config.json');

const requiredScope = { playlist: ['playlist-read-collaborative', 'playlist-read-private'], album: ['user-library-read'], track: ['user-library-read']};
const supportedMethods = ['playlist', 'track', 'album'];

module.exports = (state, method, getAll) => {
	return new Promise(async (resolve, reject) => {
		try {
			// checks
			if(!state) return reject({ error: new Error('State token not present.')});
			if(!method) return reject({ error: new Error('Method not present.')});
			method = method.toLowerCase();
			if(supportedMethods.indexOf(method) == -1) return reject({ error: new Error('Method not supported.')});
			// process
			const doc = await models.State.findOne({ state });
			const url = 'https://api.spotify.com/v1/me/' + method + 's';
			const authHead = utils.authHeader(doc.tokenType + ' ' + doc.accessToken);
			// signale.info(doc);
			if(!doc || !doc.accessToken || !doc.refreshToken) return reject({ error: new Error('No data in database.'), redirect: config.hostname + '/login'});
			if(!utils.hasScope(doc.scope, requiredScope[method])) return reject({ redirect: config.hostname + '/login' }); // Doesn't have required scope.
			var apiRes = await network.get(url, authHead);
			if(getAll && JSON.parse(apiRes.body).total > 20) {
				apiRes = JSON.stringify(await batchFetch(JSON.parse(apiRes.body), url, authHead));
			}
			resolve(apiRes);
		} catch(e) {
			reject(e);
		}
	});
}


function batchFetch(obj, url, authHead) {
	return new Promise(async (resolve, reject) => {
		try {
			for (var i = 20; i < obj.total; i += 20) {
				// i = offset
				// console.log(i, obj.total);
				resBody = await network.get(url + '?offset=' + i, authHead);
				resBody = JSON.parse(resBody.body);
				obj.items = utils.mergeArr(resBody.items, obj.items);
			}
			resolve(obj);
		} catch(e) {
			reject(e);
		}
	});	
}
