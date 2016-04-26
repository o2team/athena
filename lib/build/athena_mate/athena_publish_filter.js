/**
* @fileoverview client模式专用，缓存前一次发布的文件md5，同时做一层过滤
* @author  liweitao@jd.com
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
  return through2.obj(function (file, encoding, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }
    if (file.isStream()) {
      return cb(null, file);
    }
    var fpath = file.path;
    fpath = Util.getStaticPath(fpath).path;
    if (fpath.indexOf('\\') >= 0) {
      fpath = fpath.replace(/\\/g, '\/');
    }
    fileNameList.push(fpath);
    fileList.push(file);
    cb();
  }, function (cb) {
    var athenaPath = Util.getAthenaPath();
    var publishDataFileDir = path.join(athenaPath, 'publish', config.app, config.module);
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

    var mapJsonPath = path.join(config.cwd, config.module, 'dist', 'map.json');
    var mapJson = {};
    if (Util.existsSync(mapJsonPath)) {
      try {
        mapJson = JSON.parse(String(fs.readFileSync(mapJsonPath)));
      } catch (e) {
        console.log('  读取map.json文件失败！');
      }
    }
    if (_.isEmpty(mapJson) || _.isEmpty(mapJson.rev)) {
      return cb();
    }
    var newFileNameList = {};
    fileNameList.forEach(function (item, i) {
      var revName = Util.getHashName(item, mapJson);
      if (fileNameList.indexOf(revName) >= 0) {
        newFileNameList[item] = revName;
      }
    });
    var publishFileNames = [];

    for (var item in newFileNameList) {
      if (!publishDataFileJson[item]) {
        publishFileNames.push(item);
        publishFileNames.push(newFileNameList[item]);
      } else {
        if (publishDataFileJson[item] !== newFileNameList[item]) {
          publishFileNames.push(item);
          publishFileNames.push(newFileNameList[item]);
        }
      }
    }
    _.assign(publishDataFileJson, newFileNameList);
    fs.writeFileSync(publishDataFilePath, JSON.stringify(publishDataFileJson, null ,2));
    fileList.forEach(function (item) {
      var name = Util.getStaticPath(item.path).path;
      if (name.indexOf('\\') >= 0) {
        name = name.replace(/\\/g, '\/');
      }
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
