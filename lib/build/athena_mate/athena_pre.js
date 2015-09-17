'use strict';

var through = require('through-gulp');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var gutil = require('gulp-util');

var Util = require('../../util');

var config = {};

function pre (opts) {
  config = _.assign({
    module: null,
    cwd: null
  }, opts);
  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at pre!'));
    return;
  }
  var modulePath = path.join(config.cwd, config.module);
  var moduleConf = require(path.join(modulePath, 'module-conf'));
  var appConf = require(path.join(config.cwd, 'app-conf'));

  var stream = through(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var extname = path.extname(file.path);
      if (extname.match(/js/)) {
        file.contents = new Buffer(processJs(file.contents.toString()));
      } else if (extname.match(/(css|sass|less)/)) {
        file.contents = new Buffer(processCss(file.contents.toString()));
      } else if (extname.match(/html/)) {
        file.contents = new Buffer(processHtml(file.contents.toString()));
      }
      this.push(file);
      callback();
    } else if (file.isStream()){

      return callback(null, file);
    }
  }, function (callback) {

    callback();
  });
  return stream;
}

function processHtml (contents) {
  contents = Util.processHtml(contents, function (value) {
    var name = transmitValue(value);
    return name;
  });
  return contents;
}

function processJs (contents) {
  return contents;
}

function processCss (contents) {
  contents = Util.processCss(contents, function (value) {
    var name = transmitValue(value);
    return name;
  });
  return contents;
}

function transmitValue (value) {
  var vStart = '';
  var vEnd = '';
  if (value.indexOf('\"') >= 0 || value.indexOf('\'') >= 0) {
    vStart = value[0];
    vEnd = value[value.length - 1];
    value = value.replace(/\"/g, '').replace(/\'/g, '');
  }
  var valueArr = path.dirname(value).split(path.sep);
  var lastSecondDir = valueArr[valueArr.length - 1];
  value = lastSecondDir + '/' + path.basename(value);
  value = vStart + config.module + '/' + value + vEnd;
  return value;
}

module.exports = pre;
