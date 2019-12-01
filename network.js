const request = require('request');
const signale = require('signale');

const get = (url, headers) => {
	return new Promise((resolve, reject) => {
		if(!url) return reject(new Error('URL not given!'));
		const options = {
			url: url,
			headers: headers,
		}
		// signale.info('Sending GET req to', options.url, 'with headers', JSON.stringify(headers));
		request(options, (err, res, body) => {
			// signale.debug(err, res.statusCode, body)
			if (err || res.statusCode != 200) return reject({error: new Error('An error occured while sending GET request. Error & responce code: ' + err + res.statusCode + '\nbody: ' + body), body: JSON.parse(body)});
			resolve({body: body, res: res});
		});
	});	
}

const post = (url, data, headers) => {
	return new Promise((resolve, reject) => {
		if(!url) return reject(new Error('URL not given!'));
		// signale.info('Sending POST req to', url, 'with data', data);
		var obj = {
			url: url,
			json: data.json,
			form: data.form,
			body: data.body,
			headers: headers,
		}
		request.post(obj, (err, res, body) => {
			// signale.info(res.statusCode);
			if (err || res.statusCode != 200) return reject({ error: new Error('An error occured while sending POST request. Body: ' + body), body: JSON.parse(body)});
			resolve(body);
		});
	});	
}

module.exports.get = get;
module.exports.post = post;