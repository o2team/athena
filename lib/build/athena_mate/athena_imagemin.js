/**
 * 从gulp-imagemin修改而来，主要是为了适应本项目
 * 原repo https://github.com/sindresorhus/gulp-imagemin
 * Copyright (c) Sindre Sorhus
 */

'use strict';

var through = require('through-gulp');
var path = require('path');
var _ = require('lodash');
var gutil = require('gulp-util');
var Imagemin = require('imagemin');
var chalk = require('chalk');

var Util = require('../../util');

function imagemin (opts) {
  opts = _.assign({
    verbose: process.argv.indexOf('--verbose') !== -1
  }, opts);
  var totalBytes = 0;
	var totalSavedBytes = 0;
	var totalFiles = 0;
	var validExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
  var savedInfo = {};
  var stream = through(function (file, encoding, callback) {
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
      var imagemin = new Imagemin()
  			.src(file.contents)
  			.use(Imagemin.gifsicle({interlaced: opts.interlaced}))
  			.use(Imagemin.jpegtran({progressive: opts.progressive}))
  			.use(Imagemin.optipng({optimizationLevel: opts.optimizationLevel}))
  			.use(Imagemin.svgo({
  				plugins: opts.svgoPlugins || [],
  				multipass: opts.multipass
  			}));

      if (opts.use) {
  			opts.use.forEach(imagemin.use.bind(imagemin));
  		}
      imagemin.run(function (err, files) {
  			if (err) {
  				cb(new gutil.PluginError('imagemin:', err, {fileName: file.path}));
  				return;
  			}

  			var originalSize = file.contents.length;
  			var optimizedSize = files[0].contents.length;
  			var saved = originalSize - optimizedSize;
  			var percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
  			var savedMsg = '节约了 ' + Util.prettyBytes(saved) + ' - ' + percent.toFixed(1).replace(/\.0$/, '') + '%';
  			var msg = saved > 0 ? savedMsg : '已经是压缩好了！';
        savedInfo[file.relative] = {
          originalSize: originalSize,
          optimizedSize: optimizedSize,
          saved: saved
        };
  			totalBytes += originalSize;
  			totalSavedBytes += saved;
  			totalFiles++;

  			if (opts.verbose) {
  				gutil.log('imagemin:', chalk.green('✔ ') + file.relative + chalk.gray(' (' + msg + ')'));
  			}

  			file.contents = files[0].contents;
  			callback(null, file);
  		});
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
