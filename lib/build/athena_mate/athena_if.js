/**
* @fileoverview 在pipe管道流时实现判断
* @author  liweitao
*/

'use strict';

var ternaryStream = require('ternary-stream');
var through2 = require('through2');
var minimatch = require('minimatch');

module.exports = function (condition, trueChild, falseChild, minimatchOptions) {
	if (!trueChild) {
		throw new Error('athena-if: child action is required');
	}

	if (typeof condition === 'boolean') {
		return condition ? trueChild : (falseChild || through2.obj());
	}

	function classifier (file) {
		return !!minimatch(file.relative, condition, minimatchOptions);
	}

	return ternaryStream(classifier, trueChild, falseChild);
};
