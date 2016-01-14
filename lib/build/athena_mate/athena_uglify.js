/**
 * 从gulp-uglify修改而来，主要是为了适应本项目
 * 原repo https://github.com/terinjokes/gulp-uglify
 * Copyright (c) 2013-2014 Terin Stock terinjokes@gmail.com
 */

'use strict';

var csso = require('csso');
var gutil = require('gulp-util');
var through2 = require('through2');
var uglify = require('uglify-js');
var saveLicense = require('uglify-save-license');
var _ = require('lodash');

var reSourceMapComment = /\n\/\/# sourceMappingURL=.+?$/;
var PLUGIN_NAME = 'uglify';

function trycatch(fn, handle) {
  try {
    return fn();
  } catch (e) {
    return handle(e);
  }
}

function createError(file, err) {
  if (typeof err === 'string') {
    return new gutil.PluginError(PLUGIN_NAME, file.path + ': ' + err, {
      fileName: file.path,
      showStack: false
    });
  }

  var msg = err.message || err.msg || /* istanbul ignore next */ 'unspecified error';

  return new gutil.PluginError(PLUGIN_NAME, file.path + ': ' + msg, {
    fileName: file.path,
    lineNumber: err.line,
    stack: err.stack,
    showStack: false
  });
}

module.exports = function (opts) {
  opts = _.assign({
    fromString: true,
    output: {}
  }, opts);

  if (opts.preserveComments === 'all') {
    opts.output.comments = true;
  } else if (opts.preserveComments === 'some') {
    // preserve comments with directives or that start with a bang (!)
    opts.output.comments = /^!|@preserve|@license|@cc_on/i;
  } else if (opts.preserveComments === 'license') {
    opts.output.comments = saveLicense;
  } else if (typeof opts.preserveComments === 'function') {
    opts.output.comments = opts.preserveComments;
  }

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
      var mangled = trycatch(function() {
        var m = uglify.minify(String(file.contents), opts);
        m.code = new Buffer(m.code.replace(reSourceMapComment, ''));
        return m;
      }, createError.bind(null, file));

      if (mangled instanceof gutil.PluginError) {
        return callback(mangled);
      }

      file.contents = mangled.code;
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
