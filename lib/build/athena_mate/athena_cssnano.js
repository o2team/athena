/**
* @fileoverview 调用CSSNANO实现CSS压缩
* @author  liweitao
*/

'use strict';

var cssnano = require('cssnano');
var gutil = require('gulp-util');
var through2 = require('through2');
var _ = require('lodash');

var PLUGIN_NAME = 'athena_cssnano';

module.exports = function (opts) {
  opts = _.assign({}, opts);
  var savedInfo = {};
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isStream()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var contents = file.contents;
      var originalSize = contents.length;
      var optimizedSize;
      var saved;
      var percent;
      cssnano.process(String(file.contents), _.assign({
        map: false,
        zindex: false,
        safe: true,
        from: file.relative,
        to: file.relative
      }, opts)).then(function (result) {
        file.contents = new Buffer(result.css);
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
      }.bind(this))
      .catch(function (error) {
        var errorOptions = {fileName: file.path};
        if (error.name === 'CssSyntaxError') {
          error = error.message + error.showSourceCode();
          errorOptions.showStack = false;
        }
        setImmediate(function () {
          callback(new gutil.PluginError(PLUGIN_NAME, error));
        });
      });
    }
  }, function (callback) {
    if (typeof opts.onComplete === 'function') {
      opts.onComplete(savedInfo);
    }
    callback();
  });

  return stream;
};
