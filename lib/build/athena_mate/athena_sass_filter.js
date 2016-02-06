'use strict';
var fs = require('fs');
var path = require('path');
var through2 = require('through2');
var mkdirp = require('mkdirp');
var _ = require('lodash');

var Util = require('../../util');

module.exports = function (opts) {
  var config = _.assign({
    app: null,
    module: null
  }, opts);
  var sassCacheFolder = 'sass';
  var athenaPath = Util.getAthenaPath();
  var files = [];
  var sassMd5Hash = {};
  var sassMd5HashArr = [];
  return through2.obj(function (file, encoding, cb) {
    if (file.isNull() || file.isStream()) {
      return cb(null, file);
    }
    var md5Hash = Util.checksum(file.contents);
    sassMd5Hash[file.path] = md5Hash;
    sassMd5HashArr.push(md5Hash);
    files.push(file);
    cb();
  }, function (cb) {
    var sassCacheJson = {};
    var sassCachePath = path.join(athenaPath, 'cache', 'build', sassCacheFolder, config.app, config.module);
    var sassCacheFilePath = path.join(sassCachePath, 'cache.json');
    var checkedFilenames = [];
    if (!Util.existsSync(sassCachePath)) {
      mkdirp.sync(sassCachePath);
    } else {
      if (Util.existsSync(sassCacheFilePath)) {
        try {
          sassCacheJson = JSON.parse(fs.readFileSync(sassCacheFilePath));
        } catch (e) {
          console.log(e);
          sassCacheJson = {};
        }
      }
    }
    if (!_.isEmpty(sassCacheJson)) {
      for (var i in sassCacheJson) {
        if (sassMd5Hash[i] !== sassCacheJson[i]) {
          checkedFilenames.push(i);
        }
      }
      files.forEach(function (item) {
        var fpath = item.path;
        var name = path.basename(fpath, path.extname(fpath));
        var dirname = path.dirname(fpath);
        var cssPath = path.join(dirname, name + '.css');
        if ((checkedFilenames.indexOf(item.path) >= 0) || !Util.existsSync(cssPath)) {
          this.push(item);
        }
      }.bind(this));
    } else {
      files.forEach(function (item) {
        this.push(item);
      }.bind(this));
    }
    fs.writeFileSync(sassCacheFilePath, JSON.stringify(_.assign(sassCacheJson, sassMd5Hash), null, 2));
    cb();
  });
};
