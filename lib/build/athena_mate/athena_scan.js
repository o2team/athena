'use strict';

var through2 = require('through2');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var gutil = require('gulp-util');
var Util = require('../../util');

var ViewHelper = {
  mapJson: null,
  dataJson: null,
  tpl: null,
  // 输出样式表链接
  getCSS: function (resourceName, moduleName) {
    var cssName = path.basename(ViewHelper.tpl,  path.extname(ViewHelper.tpl));
    if (!moduleName || (moduleName === ViewHelper.config.module)) {
      moduleName = ViewHelper.config.module;
    }
    if (!ViewHelper.mapJson.include[ViewHelper.tpl]) {
      ViewHelper.mapJson.include[ViewHelper.tpl] = {
        'css': [],
        'js': [],
      };
    }

    if (resourceName) {
      // 必须为css
      var resArr = resourceName.split('.');
      if (!Util.regexps.css.test(resourceName)) {
        return;
      }
      cssName = resArr[0];
    }
    ViewHelper.mapJson.include[ViewHelper.tpl].css.push({
      name: cssName + '.css',
      module: moduleName
    });
    resourceName = cssName + '.css';
    if (resourceName && moduleName) {
      return '<%= getCSS(\'' + resourceName + '\', \'' + moduleName + '\') %>';
    }
    if (resourceName && !moduleName) {
      return '<%= getCSS(\'' + resourceName + '\') %>';
    }
    if (!resourceName && !moduleName) {
      return '<%= getCSS() %>';
    }

    return '';
  },
  // 输出js引用链接
  getJS: function (resourceName, moduleName) {
    var jsName = path.basename(ViewHelper.tpl,  path.extname(ViewHelper.tpl));
    var scriptPre = '';
    if (!moduleName || (moduleName === ViewHelper.config.module)) {
      moduleName = ViewHelper.config.module;
    }
    if (!ViewHelper.mapJson.include[ViewHelper.tpl]) {
      ViewHelper.mapJson.include[ViewHelper.tpl] = {
        'css': [],
        'js': [],
      };
    }
    if (resourceName) {
      // 必须为js
      var resArr = resourceName.split('.');
      if (!Util.regexps.js.test(resourceName)) {
        return;
      }
      jsName = resArr[0];
    }
    ViewHelper.mapJson.include[ViewHelper.tpl].js.push({
      name: jsName + '.js',
      module: moduleName
    });
    resourceName = jsName + '.js';
    if (resourceName && moduleName) {
      scriptPre = '<%= getJS(\'' + resourceName + '\', \'' + moduleName + '\') %>';
    }else if (resourceName && !moduleName) {
      scriptPre = '<%= getJS(\'' + resourceName + '\') %>';
    }else if (!resourceName && !moduleName) {
      scriptPre =  '<%= getJS() %>';
    }
    return scriptPre + '\n' + '<!-- includeScriptEndPlaceHolder -->';
  },
  __uri: function (src) {
    return '__uri(' + src + ')';
  },
  widget: {
    name: '',
    str: '',
    // 加载widget组件
    load: function (widgetName, param, moduleName) {
      // 根据widgetName 和 moduleName去寻找widget
      moduleName = moduleName ? moduleName : ViewHelper.config.module;
      param = param ? param : {};
      var modulePath = path.join(ViewHelper.config.cwd, moduleName);
      var widgetPath = getWidgetPath(modulePath, widgetName);
      var widgetItem = {
        widgetName: widgetName,
        module: moduleName,
        moduleId: require(path.join(modulePath, 'module-conf')).moduleId
      };
      var widgets = _.map(ViewHelper.mapJson.dependency[ViewHelper.tpl], 'widgetName');
      if (!ViewHelper.dataJson[widgetName]) {
        ViewHelper.dataJson[widgetName] = {
          module: moduleName,
          params: []
        };
      }
      if (!_.isEmpty(param)) {
        ViewHelper.dataJson[widgetName]['params'].push(param);
      }

      if (fs.existsSync(widgetPath)) {
        if (widgets.indexOf(widgetItem.widgetName) < 0) {
          ViewHelper.mapJson.dependency[ViewHelper.tpl].push(widgetItem);
        }
        try {
          if (Util.existsSync(path.join(widgetPath, widgetName + '.html'))) {
            var widgetHtmlStr = '';
            var widgetBuf = fs.readFileSync(path.join(widgetPath, widgetName + '.html'));
            var widgetContent = String(widgetBuf);
            var paramClone = Object.create(param);
            var widgetParam = _.merge(paramClone, ViewHelper);
            widgetHtmlStr = _.template(widgetContent)(widgetParam);
          }
        } catch (err) {
          gutil.log(gutil.colors.red('页面 ' + ViewHelper.tpl + ' 引用组件 ' + widgetName + ' 的模板中存在语法错误！'));
          throw err;
        }
        widgetItem.exists = true;
      } else {
        widgetItem.exists = false;
        gutil.log(gutil.colors.red(ViewHelper.tpl + ' widget ' + widgetName + ' can not find!'));
      }
      var widgetLoad = '<%= widget.load(\'' + widgetName + '\', ' + JSON.stringify(param) + ', \'' + moduleName + '\') %>';
      return widgetLoad;
    },

    scriptStart: function () {
      return '<% widget.scriptStart() %>';
    },

    scriptEnd: function () {
      return '<% widget.scriptEnd() %>';
    }
  }
};

function getWidgetPath (modulePath, widgetName) {
  return path.join(modulePath, 'widget', widgetName);
}

function generateFileHtml (file, config, mapJson, dataJson) {
  var fileString = file.contents.toString();
  var filenameShort = path.basename(file.path);
  ViewHelper.tpl = filenameShort;
  ViewHelper.config = config;
  mapJson.dependency[filenameShort] = [];
  ViewHelper.mapJson = mapJson;
  ViewHelper.dataJson = dataJson;
  var ret = '';
  try {
    ret = _.template(fileString)(ViewHelper);
  } catch (e) {
    gutil.log(gutil.colors.red('页面 ' + ViewHelper.tpl + ' 存在语法错误！'));
    throw e;
  }
  return ret;
}

function resourceScan (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined
  }, opts);
  var fileMapJson = {
    dependency: {},
    include: {}
  };

  var dataJson = {};

  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at scan!'));
    return;
  }

  var mapJsonPath = path.join(config.cwd, config.module, 'dist', 'map.json');

  if (fs.existsSync(mapJsonPath)) {
    fileMapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
  }
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isBuffer()) {
      var fileType = path.extname(file.path);
      var fileString = generateFileHtml(file, config, fileMapJson, dataJson);
      file.contents = new Buffer(fileString);
      this.push(file);
      callback();
    } else if (file.isStream()){

      return callback(null, file);
    }
  }, function (callback) {
    var modulePath = path.join(config.cwd, config.module);
    var dest = path.join(modulePath, 'dist');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.writeFileSync(path.join(dest, 'map.json'), JSON.stringify(fileMapJson, null, 2));
    fs.writeFileSync(path.join(dest, 'data.json'), JSON.stringify(dataJson, null, 2));
    callback();
  });
  return stream;
}

module.exports = resourceScan;
