function hasScope(scopes, required) {
	if(typeof required === 'String') required = [ required ];
	returnScope = true;
	required.forEach(e => {
		// console.log(e, scopes, scopes.includes(e));
		if(!scopes.includes(e)) returnScope = false;
	});
	return returnScope;
}

function authHeader(value) {
	return { Authorization: value };
}

function mergeArr(arr1, arr2) {
	arr1.forEach(e => arr2.push(e));
	return arr2;
}

exports.hasScope = hasScope;
exports.authHeader = authHeader;
exports.mergeArr = mergeArr;
