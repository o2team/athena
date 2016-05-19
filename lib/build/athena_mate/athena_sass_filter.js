/**
* @fileoverview 根据文件md5及sass文件依赖关系过滤指定文件，在sass编译时候会使用
* @author  liweitao
*/

'use strict';
var fs = require('fs');
var path = require('path');
var through2 = require('through2');
var mkdirp = require('mkdirp');
var _ = require('lodash');

var Util = require('../../util');

module.exports = function (opts) {
  var config = _.assign({
    cwd: null,
    app: null,
    module: null,
    isForce: false,
    common: 'gb',
    moduleList: [],
    checkCb: function () {} // 过滤中加入判断回调
  }, opts);
  var athenaPath = Util.getAthenaPath();
  var files = [];
  var cacheMd5Hash = {};
  var cacheMd5HashArr = [];
  return through2.obj(function (file, encoding, cb) {
    if (file.isNull() || file.isStream()) {
      return cb(null, file);
    }
    // 收集传入文件的md5
    var md5Hash = Util.checksum(file.contents, 16);
    cacheMd5Hash[file.path] = md5Hash;
    cacheMd5HashArr.push(md5Hash);
    files.push(file);
    cb();
  }, function (cb) {
    var cacheJson = {};
    var cachePath = path.join(athenaPath, 'cache', 'build', 'sass', config.app, config.module);
    var cacheFilePath = path.join(cachePath, 'cache.json');
    var checkedFilenames = [];
    var forceCheckedFilenames = [];
    
    if (!Util.existsSync(cachePath)) {
      mkdirp.sync(cachePath);
    } else {
       cacheJson = Util.readJsonFile(cacheFilePath);
    }
    if (!_.isEmpty(cacheJson) && !config.isForce) {
      for (var i in cacheJson) {
        if (cacheMd5Hash[i] !== cacheJson[i]) {
          // 根据sass graph搜寻
          var moduleName = config.module;
          if (moduleName !== config.common) {
            var sassGraphJson = Util.readJsonFile(path.join(config.cwd, moduleName, 'dist', 'sass_graph.json'));
            for (var key in sassGraphJson) {
              if (sassGraphJson[key].imported.indexOf(i) >= 0) {
                checkedFilenames.push(key);
                forceCheckedFilenames.push(key);
              }
            }
          } else {
            var appSassGraphJson = {};
            var appSassCacheJSon = {};
            var changedModules = [];
            config.moduleList.forEach(function (item) {
              appSassGraphJson[item] = Util.readJsonFile(path.join(config.cwd, item, 'dist', 'sass_graph.json'));
              appSassCacheJSon[item] = Util.readJsonFile(path.join(Util.getAthenaPath(), 'cache', 'build', 'sass', config.app, item, 'cache.json'));
            });
            for (var k in appSassGraphJson) {
              for (var j in appSassGraphJson[k]) {
                if (appSassGraphJson[k][j].imported.indexOf(i) >= 0) {
                  checkedFilenames.push(key);
                  forceCheckedFilenames.push(key);
                  changedModules.push(k);
                  delete appSassCacheJSon[k][j];
                }
              }
            }
            for (var i in appSassCacheJSon) {
              if (changedModules.indexOf(i) >= 0 && i !== moduleName) {
                fs.writeFileSync(path.join(Util.getAthenaPath(), 'cache', 'build', 'sass', config.app, i, 'cache.json'), JSON.stringify(appSassCacheJSon[i], null, 2));
              }
            }
          }
          checkedFilenames.push(i);
        }
      }
      checkedFilenames = _.sortedUniq(checkedFilenames);
      checkedFilenames = checkedFilenames.filter(function (item) {
        return path.basename(item)[0] !== '_';
      });
      files.forEach(function (item) {
        var checkedIn = config.checkCb(item, forceCheckedFilenames);
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
