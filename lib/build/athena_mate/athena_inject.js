/**
* @fileoverview client模式专用，主要执行getCSS和getJS，解析出完整的html文件
* @author  liweitao@jd.com
*/

'use strict';

var through2 = require('through2');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');
var mkdirp = require('mkdirp');

var Util = require('../../util');

var mapJSONCache = {};

function inject (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined,
    shtml: {}
  }, opts);
  var modulePath = path.join(config.cwd, config.module);
  var dest = path.join(modulePath, 'dist');
  var mapJson = JSON.parse(fs.readFileSync(path.join(dest, 'map.json')).toString());
  mapJSONCache[config.module] = mapJson;
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var filename = path.basename(file.path);
      var fileString = generateFileHtml(file, config);
      file.contents = new Buffer(fileString);
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

function getWidgetPath (modulePath, widgetName) {
  return path.join(modulePath, 'dist', '_', 'widget', widgetName);
}

function generateFileHtml (file, config) {
  var fileString = file.contents.toString();
  var filenameShort = path.basename(file.path);
  ViewHelper.tpl = filenameShort;
  ViewHelper.config = config;
  return _.template(fileString)(ViewHelper);
}

var ViewHelper = {
  tpl: null,
  getCSS: function (resourceName, moduleName) {
    // 默认为当前页面的css名称
    var cssName = path.basename(ViewHelper.tpl, '.html');
    var shtmlConf = ViewHelper.config.shtml;
    if (!moduleName || (moduleName === ViewHelper.config.module)) {
      moduleName = ViewHelper.config.module;
    }
    if (!mapJSONCache[moduleName]) {
      var mapJsonPath = path.join(ViewHelper.config.cwd, moduleName, 'dist', 'map.json');
      if (!Util.existsSync(mapJsonPath)) {
        throw new Error('请先编译模块 ' + moduleName);
      }
      mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(mapJsonPath).toString());
    }

    if (resourceName) {
      // 必须为css
      var resArr = resourceName.split('.');
      if (resArr[1] !== 'css') {
        return;
      }
      cssName = resArr[0];
    }
    var linkText = '';
    var cssUrl = 'css/' + cssName + '.css';

    cssUrl = '/' + moduleName + '/' + cssUrl;
    if (shtmlConf.use && shtmlConf.needCombo) {
      var combouse = '/' + moduleName + '/css/' + cssName + '.css';
      linkText = '<link rel="stylesheet" type="text/css" href="' + cssUrl + '" combo-use="' + combouse + '">';
    } else {
      linkText = '<link rel="stylesheet" type="text/css" href="' + cssUrl + '">';
    }

    return linkText;
  },
  // 输出js引用链接
  getJS: function (resourceName, moduleName) {
    // 默认为当前页面的js名称
    var jsName = path.basename(ViewHelper.tpl, '.html');
    if (!moduleName || (moduleName === ViewHelper.config.module)) {
      moduleName = ViewHelper.config.module;
    }
    if (!mapJSONCache[moduleName]) {
      var mapJsonPath = path.join(ViewHelper.config.cwd, moduleName, 'dist', 'map.json');
      if (!Util.existsSync(mapJsonPath)) {
        throw new Error('请先编译模块 ' + moduleName);
      }
      mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(mapJsonPath).toString());
    }
    if (resourceName) {
      // 必须为js
      var resArr = resourceName.split('.');
      if (resArr[1] !== 'js') {
        return;
      }
      jsName = resArr[0];
    }
    var jsUrl = 'js/' + jsName + '.js';
    jsUrl = '/' + moduleName + '/' + jsUrl;
    var scriptText = '<script src="' + jsUrl + '"></script>';
    return scriptText;
  },
  __uri: function (src) {
    return '__uri(' + src + ')';
  }
};

module.exports = inject;
