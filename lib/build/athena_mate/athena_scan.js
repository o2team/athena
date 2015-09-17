'use strict';

var through = require('through-gulp');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');

var fileMapJson = {
  dependency: {},
  include: {}
};
var config = {};

var ViewHelper = {
  tpl: null,
  // 输出样式表链接
  getCSS: function (resourceName, moduleName) {
    var cssName = path.basename(ViewHelper.tpl, '.html');
    if (!moduleName || (moduleName === config.module)) {
      moduleName = config.module;
    }
    if (!fileMapJson.include[ViewHelper.tpl]) {
      fileMapJson.include[ViewHelper.tpl] = {
        'css': [],
        'js': [],
      };
    }

    if (resourceName) {
      // 必须为css
      var resArr = resourceName.split('.');
      if (resArr[1] !== 'css') {
        return;
      }
      cssName = resArr[0];
    }
    fileMapJson.include[ViewHelper.tpl].css.push({
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
    var jsName = path.basename(ViewHelper.tpl, '.html');
    var scriptPre = '';
    if (!moduleName || (moduleName === config.module)) {
      moduleName = config.module;
    }
    if (!fileMapJson.include[ViewHelper.tpl]) {
      fileMapJson.include[ViewHelper.tpl] = {
        'css': [],
        'js': [],
      };
    }
    if (resourceName) {
      // 必须为js
      var resArr = resourceName.split('.');
      if (resArr[1] !== 'js') {
        return;
      }
      jsName = resArr[0];
    }
    fileMapJson.include[ViewHelper.tpl].js.push({
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
  widget: {
    name: '',
    str: '',
    // 加载widget组件
    load: function (widgetName, param, moduleName) {
      // 根据widgetName 和 moduleName去寻找widget
      moduleName = moduleName ? moduleName : config.module;
      param = param ? param : {};
      var modulePath = config.cwd + '/' + moduleName;
      var widgetPath = getWidgetPath(modulePath, widgetName);
      var widgetItem = {
        widgetName: widgetName,
        param: param,
        module: moduleName
      };
      var widgetHtmlStr = '';
      var widgets = _.pluck(fileMapJson.dependency[ViewHelper.tpl], 'widgetName');
      if (widgets.indexOf(widgetItem.widgetName) < 0) {
        fileMapJson.dependency[ViewHelper.tpl].push(widgetItem);
      }
      if (fs.existsSync(widgetPath)) {
        widgetItem.exists = true;
        try {
          var widgetBuf = fs.readFileSync(path.join(widgetPath, widgetName + '.html'));
          var widgetContent = String(widgetBuf);
          var paramClone = Object.create(param);
          var widgetParam = _.merge(paramClone, ViewHelper);
          widgetHtmlStr = _.template(widgetContent)(widgetParam);
        } catch (err) {
          console.log(ViewHelper.tpl, widgetItem.widgetName, err.stack);
        }
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

function generateFileHtml (file) {
  var fileString = file.contents.toString();
  var filenameShort = path.basename(file.path);
  ViewHelper.tpl = filenameShort;
  fileMapJson.dependency[filenameShort] = [];
  return _.template(fileString)(ViewHelper);
}

function resourceScan (opts) {
  config = _.assign({
    cwd: undefined,
    module: undefined
  }, opts);

  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at scan!'));
    return;
  }

  fileMapJson = {
    dependency: {},
    include: {}
  };
  var stream = through(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isBuffer()) {
      var fileType = path.extname(file.path);
      var fileString = generateFileHtml(file);
      // 将js代码片段写入html中
      file.contents = new Buffer(fileString);
      this.push(file);
      callback();
    } else if (file.isStream()){

      return callback(null, file);
    }
  }, function (callback) {
    var modulePath = config.cwd + '/' + config.module;
    var dest = path.join(modulePath, 'dist');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.writeFileSync(path.join(dest, 'map.json'), JSON.stringify(fileMapJson, null, 2));
    callback();
  });
  return stream;
}

module.exports = resourceScan;
