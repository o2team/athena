/**
* @fileoverview babel编译
* @author  liweitao
*/

var path = require('path');
var gutil = require('gulp-util');
var through2 = require('through2');
var applySourceMap = require('vinyl-sourcemaps-apply');
var babel = require('babel-core');
var _ = require('lodash');
var Util = require('../../util');

module.exports = function (opts) {
  opts = _.assign({}, opts);
  return through2.obj(function (file, enc, cb) {
    if (file.isNull() || file.isStream()) {
			cb(null, file);
			return;
		}
    var filename = file.path;
    if (!opts.fileTest.test(filename)) {
      this.push(file);
      return cb();
    }
    try {
      var fileOpts = _.assign({}, opts.config, {
				filename: filename,
				filenameRelative: file.relative,
				sourceMap: Boolean(file.sourceMap),
				sourceFileName: file.relative,
				sourceMapTarget: file.relative
			});
      var res = babel.transform(file.contents.toString(), fileOpts);
      if (file.sourceMap && res.map) {
				applySourceMap(file, res.map);
			}

			if (!res.ignored) {
				file.contents = new Buffer(res.code);
			}
      file.babel = res.metadata;
			this.push(file);
    } catch (err) {
      this.emit('error', new gutil.PluginError('athena-babel', err, {
				fileName: file.path,
				showProperties: false
			}));
    }
    cb();
  });
};