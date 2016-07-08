/**
 * @fileoverview base64处理
 * @author  littly
 */

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
	return function (mod, modulePath, appPath) {
		return new Promise(function (resolve, reject) {
			var path = require('path'),
				vfs = require('vinyl-fs'),
				through2 = require('through2'),
				athenaMate = require('../athena_mate'),
				Util = require('../../util');

			var outputPath = path.join(modulePath, 'dist/output'),
				base64Enabled,
				base64Exclude = [],
				base64Size = 0;

			if (moduleConf.support.base64) {
				base64Enabled = moduleConf.support.base64.enable;
				base64Exclude = moduleConf.support.base64.exclude;
				base64Size = moduleConf.support.base64.size;
			}
			else {
				base64Enabled = false;
			}

			vfs.src(path.join(outputPath, 'css/**'))
				.pipe(athenaMate.if(base64Enabled, athenaMate.base64({
					app: appConf.app,
					module: moduleConf.module,
					cwd: appPath,
					outputPath: outputPath,
					exclude: base64Exclude,
					size: base64Size,
					isServe: args.isServe
				})))
				.pipe(vfs.dest(path.join(outputPath, 'css')))
				.on('end', resolve);
		});
	};
};