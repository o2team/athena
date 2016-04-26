/**
 * 从gulp-uglify修改而来，主要是为了适应本项目
 * 原repo https://github.com/terinjokes/gulp-uglify
 * Copyright (c) 2013-2014 Terin Stock terinjokes@gmail.com
 */

'use strict';

var gutil = require('gulp-util');
var through2 = require('through2');
var uglify = require('uglify-js');
var saveLicense = require('uglify-save-license');
var _ = require('lodash');

var createError = require('./create_error');

var reSourceMapComment = /\n\/\/# sourceMappingURL=.+?$/;
var PLUGIN_NAME = 'uglify';

function trycatch(fn, handle) {
  try {
    return fn();
  } catch (e) {
    return handle(e);
  }
}

function setup(opts) {
  if (opts && !_.isObject(opts)) {
    gutil.log('uglify expects an object, non-object provided');
    opts = {};
  }

  var options = _.assign({}, opts, {
    fromString: true,
    output: {}
  });

  if (options.preserveComments === 'all') {
    options.output.comments = true;
  } else if (options.preserveComments === 'some') {
    // preserve comments with directives or that start with a bang (!)
    options.output.comments = /^!|@preserve|@license|@cc_on/i;
  } else if (options.preserveComments === 'license') {
    options.output.comments = saveLicense;
  } else if (typeof options.preserveComments === 'function') {
    options.output.comments = options.preserveComments;
  }

  return options;
}

module.exports = function (opts) {
  var savedInfo = {};
  var stream = through2.obj(function (file, encoding, callback) {
    var options = setup(opts || {});
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
        var m = uglify.minify(String(file.contents), options);
        m.code = new Buffer(m.code.replace(reSourceMapComment, ''));
        return m;
      }, createError.bind(null, PLUGIN_NAME, file));

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
