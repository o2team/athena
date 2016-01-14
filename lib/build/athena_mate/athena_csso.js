'use strict';

var csso = require('csso');
var gutil = require('gulp-util');
var through2 = require('through2');
var _ = require('lodash');

var PLUGIN_NAME = 'csso';

module.exports = function (opts) {
  opts = _.assign({
    disableStructureMinimization: false,
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
      var optimised = csso.minify(String(file.contents), {
        restructuring: !opts.disableStructureMinimization
      });
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
