/**
* @fileoverview 调用CSSO实现CSS压缩
* @author  liweitao@jd.com
*/

'use strict';

var csso = require('csso');
var gutil = require('gulp-util');
var through2 = require('through2');
var _ = require('lodash');

var createError = require('./create_error');

var PLUGIN_NAME = 'csso';

function trycatch(fn, handle) {
  try {
    return fn();
  } catch (e) {
    return handle(e);
  }
}

module.exports = function (opts) {
  opts = _.assign({
    disableStructureMinimization: true,
    onComplete: function () {}
  }, opts);
  var savedInfo = {};
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isStream()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var originalSize = file.contents.length;
      var optimizedSize;
      var saved;
      var percent;
      var optimised = trycatch(function() {
        return csso.minify(String(file.contents), {
          restructuring: !opts.disableStructureMinimization
        });
      }, createError.bind(null, PLUGIN_NAME, file));
      
      if (optimised instanceof gutil.PluginError) {
        return callback(optimised);
      }
      file.contents = new Buffer(optimised);
      optimizedSize = file.contents.length;
      saved = originalSize - optimizedSize;
      percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
      savedInfo[file.relative] = {
        originalSize: originalSize,
        optimizedSize: optimizedSize,
        saved: saved,
        percent: percent
      };
      this.push(file);
      callback();
    }
  }, function (callback) {
    if (typeof opts.onComplete === 'function') {
      opts.onComplete(savedInfo);
    }
    callback();
  });

  return stream;
};
