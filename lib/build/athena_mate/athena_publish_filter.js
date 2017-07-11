/**
* @fileoverview client模式专用，缓存前一次发布的文件md5，同时做一层过滤
* @author  liweitao
*/


'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var through2 = require('through2');
var mkdirp = require('mkdirp');
var gutil = require('gulp-util');

var Util = require('../../util');

module.exports = function (opts) {
  var config = _.assign({
    app: null,
    cwd: null,
    module: null,
    remote: null
  }, opts);
  var fileNameList = [];
  var fileList = [];
  var cacheMd5Hash = {};
  var cacheMd5HashArr = [];
  return through2.obj(function (file, encoding, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }
    if (file.isStream()) {
      return cb(null, file);
    }
    var fpath = file.path;
    var md5Hash = Util.checksum(file.contents, 16);
    cacheMd5Hash[fpath] = md5Hash;
    cacheMd5HashArr.push(md5Hash);
    fileNameList.push(fpath);
    fileList.push(file);
    cb();
  }, function (cb) {
    var cacheRootPath = path.join(config.cwd, Util.CACHE)
    var publishDataFileDir = path.join(cacheRootPath, 'publish', config.module);
    var publishDataFilePath = path.join(publishDataFileDir, config.remote + '_filter.json');
    var publishDataFileJson = {};
    if (Util.existsSync(publishDataFilePath)) {
      try {
        publishDataFileJson = JSON.parse(String(fs.readFileSync(publishDataFilePath)));
        gutil.log(gutil.colors.green('检测到你之前发布过项目，正在执行智能过滤...'));
      } catch (e) {
        console.log(e);
        console.log('  读取publish文件失败！');
      }
    } else {
      mkdirp.sync(publishDataFileDir);
    }
    var publishFileNames = [];
    for (var item in cacheMd5Hash) {
      if (!publishDataFileJson[item]) {
        publishFileNames.push(item);
      } else {
        if (publishDataFileJson[item] !== cacheMd5Hash[item]) {
          publishFileNames.push(item);
        }
      }
    }
    _.assign(publishDataFileJson, cacheMd5Hash);
    fs.writeFileSync(publishDataFilePath, JSON.stringify(publishDataFileJson, null ,2));
    fileList.forEach(function (item) {
      var name = item.path;
      if (Util.regexps.tpl.test(name)) {
        this.push(item);
      } else {
        if (publishFileNames.indexOf(name) >= 0) {
          this.push(item);
        }
      }
    }.bind(this));
    cb();
  });
};
