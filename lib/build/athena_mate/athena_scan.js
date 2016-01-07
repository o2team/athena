'use strict';

var through = require('through-gulp');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var gutil = require('gulp-util');
var Util = require('../../util');

var fileMapJson = {
  dependency: {},
  include: {}
};

var dataJson = {};

var ViewHelper = {
  tpl: null,
  // 输出样式表链接
  getCSS: function (resourceName, moduleName) {
    var cssName = path.basename(ViewHelper.tpl, '.html');
    if (!moduleName || (moduleName === ViewHelper.config.module)) {
      moduleName = ViewHelper.config.module;
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
    if (!moduleName || (moduleName === ViewHelper.config.module)) {
      moduleName = ViewHelper.config.module;
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
      var widgets = _.pluck(fileMapJson.dependency[ViewHelper.tpl], 'widgetName');
      if (!dataJson[widgetName]) {
        dataJson[widgetName] = {
          module: moduleName,
          params: []
        };
      }
      if (!_.isEmpty(param)) {
        dataJson[widgetName]['params'].push(param);
      }

      if (fs.existsSync(widgetPath)) {
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
          console.log(ViewHelper.tpl, widgetName, err.stack);
        }
        widgetItem.exists = true;
      } else {
        widgetItem.exists = false;
        gutil.log(gutil.colors.red(ViewHelper.tpl + ' widget ' + widgetName + ' can not find!'));
      }
      if (widgets.indexOf(widgetItem.widgetName) < 0) {
        fileMapJson.dependency[ViewHelper.tpl].push(widgetItem);
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

function generateFileHtml (file, config) {
  var fileString = file.contents.toString();
  var filenameShort = path.basename(file.path);
  ViewHelper.tpl = filenameShort;
  ViewHelper.config = config;
  fileMapJson.dependency[filenameShort] = [];
  return _.template(fileString)(ViewHelper);
}

function resourceScan (opts) {
  var config = _.assign({
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
  var mapJsonPath = path.join(config.cwd, config.module, 'dist', 'map.json');

  if (fs.existsSync(mapJsonPath)) {
    fileMapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
  }
  var stream = through(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isBuffer()) {
      var fileType = path.extname(file.path);
      var fileString = generateFileHtml(file, config);
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
