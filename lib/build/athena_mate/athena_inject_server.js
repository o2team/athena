'use strict';

var through2 = require('through2');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');

var Util = require('../../util');

var mapJSONCache = {};
var appConf = null;

function inject (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined
  }, opts);
  var fileMapJson = {
    dependency: {},
    include: {}
  };
  var modulePath = path.join(config.cwd, config.module);
  var mapJsonPath = path.join(modulePath, 'dist', 'map.json');
  var mapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
  appConf = require(path.join(config.cwd, 'app-conf'));
  fileMapJson = _.assign(fileMapJson, mapJson);
  mapJSONCache[config.module] = mapJson;
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull() || file.isStream()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var filename = path.basename(file.path);
      var fileString = generateFileHtml(file, config, fileMapJson);
      file.contents = new Buffer(fileString);
      this.push(file);
      callback();
    }
  }, function (callback) {
    var modulePath = path.join(config.cwd, config.module);
    var dest = path.join(modulePath, 'dist');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.writeFileSync(path.join(dest, 'map.json'), JSON.stringify(fileMapJson, null, 2));
    callback();
  });
  return stream;
}

function getWidgetPath (modulePath, widgetName) {
  return path.join(modulePath, 'dist', '_', 'widget', widgetName);
}

function generateFileHtml (file, config, mapJson) {
  var fileString = file.contents.toString();
  var filenameShort = path.basename(file.path);
  ViewHelper.tpl = filenameShort;
  ViewHelper.config = config;
  ViewHelper.mapJson = mapJson;
  return _.template(fileString)(ViewHelper);
}

var ViewHelper = {
  tpl: null,
  getCSS: function (resourceName, moduleName) {
    // 默认为当前页面的css名称
    var pageTpl = ViewHelper.tpl;
    var pageName = path.basename(pageTpl, path.extname(pageTpl));
    if (typeof moduleName !== 'string') {
      moduleName = ViewHelper.config.module;
    }
    if (!mapJSONCache[moduleName]) {
      var mapJsonPath = path.join(ViewHelper.config.cwd, moduleName, 'dist', 'map.json');
      if (!Util.existsSync(mapJsonPath)) {
        throw new Error('请先编译模块 ' + moduleName);
      }
      mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(mapJsonPath).toString());
    }
    if (!ViewHelper.mapJson.include[ViewHelper.tpl]) {
      ViewHelper.mapJson.include[ViewHelper.tpl] = {
        'css': [],
        'js': [],
      };
    }
    var cssName = pageName;
    if (resourceName) {
      // 必须为css
      if (!Util.regexps.css.test(resourceName)) {
        return;
      }
      cssName = path.basename(resourceName, path.extname(resourceName));
    }
    var linkHref = '';
    var linkText = '';
    if (cssName === pageName) {
      var deps = mapJSONCache[moduleName]['dependency'];
      var pageDeps = deps[pageTpl];
      var cssLinkArr = [];
      var commonArr = [];
      pageDeps.forEach(function (item) {
        var itemName = 'widget/' + item.widgetName + '/' + item.widgetName + '.css';
        ViewHelper.mapJson.include[ViewHelper.tpl].css.push({
          name: itemName,
          module: item.module
        });
        var ret = moduleName + ':' + itemName;
        if (item.module === appConf.common) {
          commonArr.push(ret)
        } else {
          cssLinkArr.push(ret);
        }
      });
      cssLinkArr = commonArr.concat(cssLinkArr);
      var pageCSSItem = 'page/' + pageName + '/' + pageName + '.css';
      ViewHelper.mapJson.include[ViewHelper.tpl].css.push({
        name: pageCSSItem,
        module: moduleName
      });
      cssLinkArr.push(moduleName + ':' + pageCSSItem);
      linkHref = cssLinkArr.join(',');
    } else {
      var staticCssName = 'static/css/' + cssName + '.css';
      ViewHelper.mapJson.include[ViewHelper.tpl].css.push({
        name: staticCssName,
        module: moduleName
      });
      linkHref = moduleName + ':' + staticCssName;
    }
    linkText = '<link rel="stylesheet" type="text/css" href="' + linkHref + '">';
    return linkText;
  },
  // 输出js引用链接
  getJS: function (resourceName, moduleName) {
    // 默认为当前页面的js名称
    var pageTpl = ViewHelper.tpl;
    var pageName = path.basename(pageTpl, path.extname(pageTpl));
    if (typeof moduleName !== 'string') {
      moduleName = ViewHelper.config.module;
    }
    if (!mapJSONCache[moduleName]) {
      var mapJsonPath = path.join(ViewHelper.config.cwd, moduleName, 'dist', 'map.json');
      if (!Util.existsSync(mapJsonPath)) {
        throw new Error('请先编译模块 ' + moduleName);
      }
      mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(mapJsonPath).toString());
    }
    if (!ViewHelper.mapJson.include[ViewHelper.tpl]) {
      ViewHelper.mapJson.include[ViewHelper.tpl] = {
        'css': [],
        'js': [],
      };
    }
    var jsName = pageName;
    if (resourceName) {
      // 必须为js
      if (!Util.regexps.js.test(resourceName)) {
        return;
      }
      jsName = path.basename(resourceName, path.extname(resourceName));
    }
    var scriptSrc = '';
    var scriptText = '';
    if (jsName === pageName) {
      var deps = mapJSONCache[moduleName]['dependency'];
      var pageDeps = deps[pageTpl];
      var jsScriptArr = [];
      var commonArr = [];
      pageDeps.forEach(function (item) {
        var itemName = 'widget/' + item.widgetName + '/' + item.widgetName + '.js';
        ViewHelper.mapJson.include[ViewHelper.tpl].js.push({
          name: itemName,
          module: item.module
        });
        var ret = moduleName + ':' + itemName;
        if (item.module === appConf.common) {
          commonArr.push(ret)
        } else {
          jsScriptArr.push(ret);
        }
      });
      jsScriptArr = commonArr.concat(jsScriptArr);
      var pageJSItem = 'page/' + pageName + '/' + pageName + '.js';
      ViewHelper.mapJson.include[ViewHelper.tpl].js.push({
        name: pageJSItem,
        module: moduleName
      });
      jsScriptArr.push(moduleName + ':' + pageJSItem);
      scriptSrc = jsScriptArr.join(',');
    } else {
      var staticJsName = 'static/js/' + jsName + '.js';
      ViewHelper.mapJson.include[ViewHelper.tpl].js.push({
        name: staticJsName,
        module: moduleName
      });
      scriptSrc = moduleName + ':' + staticJsName;
    }
    scriptText = '<script src="' + scriptSrc + '"></script>';
    return scriptText;
  },
  __uri: function (src) {
    return '__uri(' + src + ')';
  }
};

module.exports = inject;
