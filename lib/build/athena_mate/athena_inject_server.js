/**
* @fileoverview server模式抓用，主要执行getCSS和getJS，解析出完整的html文件
* @author  liweitao
*/

'use strict';

var through2 = require('through2');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var Util = require('../../util');

var mapJSONCache = {};
var appConf = null;

var exludeResource = {
  js: [],
  css: []
};

function inject (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined,
    outCSS: false
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
  var exludeResourcePath = path.join(modulePath, 'dist', '_exlude_resource.json');
  exludeResource = Util.readJsonFile(exludeResourcePath);
  var outWidgets = [];
  if (config.outCSS) {
    var dependencyAll = mapJson.dependency;
    for (var i in dependencyAll) {
      if (Util.regexps.js.test(i)) {
        var tplname = path.basename(i, path.extname(i));
        outWidgets.push(tplname.replace('_tpl', ''));
        dependencyAll[i].forEach(function (widget) {
          var name = widget.widgetName;
          var index = outWidgets.indexOf(name);
          if (index < 0 && !widget.isCommon) {
            outWidgets.push(name);
          } else if (index >= 0 && widget.isCommon) {
            outWidgets.splice(index, 1);
          }
        });
      }
    }
  }
  ViewHelper.outWidgets = outWidgets;
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull() || file.isStream()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
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

function getResPath (modulePath, resName) {
  return path.join(modulePath, 'dist', '_', resName);
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
  getCSS: function (resourceName, moduleName, onlyPage) {
    // 默认为当前页面的css名称
    var pageTpl = ViewHelper.tpl;
    var pageName = path.basename(pageTpl, path.extname(pageTpl));
    onlyPage = onlyPage || false;
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
        'js': []
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
      var cssLinkArr = [];
      if (!onlyPage) {
        var deps = mapJSONCache[moduleName]['dependency'];
        var pageDeps = deps[pageTpl];
        var commonArr = [];
        pageDeps.forEach(function (item) {
          if (item.exists && ViewHelper.outWidgets.indexOf(item.widgetName) < 0) {
            var itemName = 'widget/' + item.widgetName + '/' + item.widgetName + '.css';
            if (!Util.existsSync(getResPath(path.join(ViewHelper.config.cwd, item.module), itemName))) {
              return;
            }
            ViewHelper.mapJson.include[ViewHelper.tpl].css.push({
              name: itemName,
              module: item.module
            });
            var ret = moduleName + ':' + itemName;
            if (item.module === appConf.common) {
              commonArr.push(ret);
            } else {
              cssLinkArr.push(ret);
            }
          }
        });
        cssLinkArr = commonArr.concat(cssLinkArr);
        if (exludeResource.css.length > 0) {
          exludeResource.css.forEach(function (item) {
            var file = item.file;
            file = file.indexOf('/') === 0 ? file.substring(1) : file;
            file = item.module + ':' + file;
            var index = cssLinkArr.indexOf(file);
            if (cssLinkArr.indexOf(file) >= 0) {
              cssLinkArr.splice(index, 1);
            }
          });
        }
      }
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
  getJS: function (resourceName, moduleName, onlyPage) {
    // 默认为当前页面的js名称
    var pageTpl = ViewHelper.tpl;
    var pageName = path.basename(pageTpl, path.extname(pageTpl));
    onlyPage = onlyPage || false;
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
        'js': []
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
      var jsScriptArr = [];
      if (!onlyPage) {
        var deps = mapJSONCache[moduleName]['dependency'];
        var pageDeps = deps[pageTpl];
        var commonArr = [];
        pageDeps.forEach(function (item) {
          if (item.exists && ViewHelper.outWidgets.indexOf(item.widgetName) < 0) {
            var itemName = 'widget/' + item.widgetName + '/' + item.widgetName + '.js';
            if (!Util.existsSync(getResPath(path.join(ViewHelper.config.cwd, item.module), itemName))) {
              return;
            }
            ViewHelper.mapJson.include[ViewHelper.tpl].js.push({
              name: itemName,
              module: item.module
            });
            var ret = moduleName + ':' + itemName;
            if (item.module === appConf.common) {
              commonArr.push(ret);
            } else {
              jsScriptArr.push(ret);
            }
          }
        });
        
        jsScriptArr = commonArr.concat(jsScriptArr);
        
        if (exludeResource.js.length > 0) {
          exludeResource.js.forEach(function (item) {
            var file = item.file;
            file = file.indexOf('/') === 0 ? file.substring(1) : file;
            file = item.module + ':' + file;
            var index = jsScriptArr.indexOf(file);
            if (jsScriptArr.indexOf(file) >= 0) {
              jsScriptArr.splice(index, 1);
            }
          });
        }
      }
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
  }
};

module.exports = inject;
