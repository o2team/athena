/**
 * 暂时只压缩了png图片
 */
'use strict';

var through2 = require('through2');
var path = require('path');
var _ = require('lodash');
var gutil = require('gulp-util');
var pngquant = require('athena-png-native');
var chalk = require('chalk');

var Util = require('../../util');

function imagemin (opts) {
  opts = _.assign({
    verbose: process.argv.indexOf('--verbose') !== -1
  }, opts);
  var totalBytes = 0;
	var totalSavedBytes = 0;
	var totalFiles = 0;
	var validExts = ['.png'];
  var savedInfo = {};
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isStream()){
      return callback(null, file);
    }
    if (file.isBuffer()) {
      if (validExts.indexOf(path.extname(file.path).toLowerCase()) === -1) {
        callback(null, file);
  			return;
      }
      var options =  {};
			options.params = '-v --iebug';
      var compressedFileContents = pngquant.option(options).compress(file.contents);

			var originalSize = file.contents.length;
			var optimizedSize = compressedFileContents.length;
			var saved = originalSize - optimizedSize;
			var percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
			var savedMsg = '节约了 ' + Util.prettyBytes(saved) + ' - ' + percent.toFixed(1).replace(/\.0$/, '') + '%';
			var msg = saved > 0 ? savedMsg : '已经是压缩好了！';
      savedInfo[file.relative] = {
        originalSize: originalSize,
        optimizedSize: optimizedSize,
        saved: saved,
        percent: percent
      };
			totalBytes += originalSize;
			totalSavedBytes += saved;
			totalFiles++;

			if (opts.verbose) {
				gutil.log('imagemin:', chalk.green('✔ ') + file.relative + chalk.gray(' (' + msg + ')'));
			}

			file.contents = compressedFileContents;
			callback(null, file);
    }
  }, function (callback) {
    var percent = totalBytes > 0 ? (totalSavedBytes / totalBytes) * 100 : 0;
    var msg = '压缩了 ' + totalFiles + ' 个图片';

    if (totalFiles > 0) {
      msg += chalk.gray(' (节约了 ' + Util.prettyBytes(totalSavedBytes) + ' - ' + percent.toFixed(1).replace(/\.0$/, '') + '%)');
    }
    if (opts.onComplete) {
      opts.onComplete(savedInfo);
    }
    gutil.log('imagemin:', msg);
    callback();
  });
  return stream;
}

module.exports = imagemin;
