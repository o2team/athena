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
    module: null,
    cacheFolder: null,
    checkCb: function () {}
  }, opts);
  var athenaPath = Util.getAthenaPath();
  var files = [];
  var cacheMd5Hash = {};
  var cacheMd5HashArr = [];
  return through2.obj(function (file, encoding, cb) {
    if (file.isNull() || file.isStream()) {
      return cb(null, file);
    }
    var md5Hash = Util.checksum(file.contents);
    cacheMd5Hash[file.path] = md5Hash;
    cacheMd5HashArr.push(md5Hash);
    files.push(file);
    cb();
  }, function (cb) {
    var cacheJson = {};
    var cachePath = path.join(athenaPath, 'cache', 'build', config.cacheFolder, config.app, config.module);
    var cacheFilePath = path.join(cachePath, 'cache.json');
    var checkedFilenames = [];
    if (!Util.existsSync(cachePath)) {
      mkdirp.sync(cachePath);
    } else {
      if (Util.existsSync(cacheFilePath)) {
        try {
          cacheJson = JSON.parse(fs.readFileSync(cacheFilePath));
        } catch (e) {
          console.log(e);
          cacheJson = {};
        }
      }
    }
    if (!_.isEmpty(cacheJson)) {
      for (var i in cacheJson) {
        if (cacheMd5Hash[i] !== cacheJson[i]) {
          checkedFilenames.push(i);
        }
      }
      files.forEach(function (item) {
        var checkedIn = config.checkCb(item);
        if ((checkedFilenames.indexOf(item.path) >= 0) || checkedIn) {
          this.push(item);
        }
      }.bind(this));
    } else {
      files.forEach(function (item) {
        this.push(item);
      }.bind(this));
    }
    fs.writeFileSync(cacheFilePath, JSON.stringify(_.assign(cacheJson, cacheMd5Hash), null, 2));
    cb();
  });
};
