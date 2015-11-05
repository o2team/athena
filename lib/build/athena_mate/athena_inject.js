'use strict';

var through = require('through-gulp');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');

var Util = require('../../util');

var config = {};
var mapJSONCache = {};

var ScriptPool = {
  cache: [],
  add: function (name, content) {
    if (_.pluck(this.cache).indexOf(name) < 0) {
      this.cache.push({
        name: name,
        script: content
      });
    }
  },

  create: function (name) {
    if (_.pluck(this.cache).indexOf(name) < 0) {
      this.cache.push({
        name: name
      });
    }
  },

  set: function (name, content) {
    for (var i = 0; i < this.cache.length; i++) {
      var item = this.cache[i];
      if (item.name === name) {
        item.script = content;
      }
    }
  },

  get: function (name) {
    var content;
    this.cache.forEach(function (item) {
      if (item.name === name) {
        content = item.script;
        return false;
      }
    });

    return content;
  }
};

function inject (opts) {
  config = _.assign({
    cwd: undefined,
    module: undefined
  }, opts);
  var modulePath = config.cwd + '/' + config.module;
  var dest = path.join(modulePath, 'dist');
  var mapJson = JSON.parse(fs.readFileSync(path.join(dest, 'map.json')).toString());
  mapJSONCache[config.module] = mapJson;
  var stream = through(function (file, encoding, callback) {
    ScriptPool.cache = [];
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var filename = path.basename(file.path);
      var fileString = generateFileHtml(file);
      // 将js代码片段写入html中
      fileString = setScript(fileString);
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

function generateFileHtml (file) {
  var fileString = file.contents.toString();
  var filenameShort = path.basename(file.path);
  ViewHelper.tpl = filenameShort;
  return _.template(fileString)(ViewHelper);
}

// 将js代码片段写入html中
function setScript (fileContent) {
  var lines = fileContent.split('\n');
  var includeScriptEndPlaceHolder = -1;
  lines.forEach(function (item, i) {
    if (/<!--[\s\S]?includeScriptEndPlaceHolder[\s\S]*?-->/g.test(item)) {
      includeScriptEndPlaceHolder = i;
    }
  });
  lines.splice(includeScriptEndPlaceHolder + 1, 0, ScriptPool.cache.map(function (line) {
    var reg = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
    line.script = line.script.replace(reg, function (m, $1) {
      if ($1.replace(Util.regexps.blank, '').length === 0) {
        return '';
      }
      return m;
    });
    return line.script;
  }).join(''));
  lines.splice(includeScriptEndPlaceHolder, 1);
  return beautifyHtml(lines.join('\n'), { indent_size: 2, max_preserve_newlines: 1 });
}

var ViewHelper = {
  tpl: null,
  getCSS: function (resourceName, moduleName) {
    // 默认为当前页面的css名称
    var cssName = path.basename(ViewHelper.tpl, '.html');
    if (!moduleName || (moduleName === config.module)) {
      moduleName = config.module;
    }
    if (!mapJSONCache[moduleName]) {
      mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(path.join(config.cwd, moduleName, 'dist', 'map.json')).toString());
    }

    if (resourceName) {
      // 必须为css
      var resArr = resourceName.split('.');
      if (resArr[1] !== 'css') {
        return;
      }
      cssName = resArr[0];
    }

    var combouse = '/' + moduleName + '/css/' + cssName + '.min.css';
    var cssUrl = 'css/' + cssName + '.css';

    cssUrl = moduleName + '/' + cssUrl;
    cssUrl = Util.getHashName(cssUrl, mapJSONCache[moduleName]);
    combouse = Util.getHashName(combouse, mapJSONCache[moduleName]);
    var linkText = '<link rel="stylesheet" type="text/css" href="' + cssUrl + '" combo-use="' + combouse + '">';
    return linkText;
  },
  // 输出js引用链接
  getJS: function (resourceName, moduleName) {
    // 默认为当前页面的js名称
    var jsName = path.basename(ViewHelper.tpl, '.html');
    if (!moduleName || (moduleName === config.module)) {
      moduleName = config.module;
    }
    if (!mapJSONCache[moduleName]) {
      mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(path.join(config.cwd, moduleName, 'dist', 'map.json')).toString());
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
    jsUrl = moduleName + '/' + jsUrl;
    jsUrl = Util.getHashName(jsUrl, mapJSONCache[moduleName]);
    var scriptText = '<script src="' + jsUrl + '"></script>';
    return scriptText;
  },
  __uri: function (src) {
    return '__uri(' + src + ')';
  },
  widget: {
    name: '',
    str: '',
    // 加载widget组件
    load: function (widgetName, param, moduleName) {
      // 根据widgetName 和 module去寻找widget
      moduleName = moduleName ? moduleName : config.module;
      param = param ? param : {};
      var modulePath = config.cwd + '/' + moduleName;
      var widgetPath = getWidgetPath(modulePath, widgetName);
      var widgetHtmlStr = '';
      if (fs.existsSync(widgetPath)) {
        try {
          var widgetBuf = fs.readFileSync(path.join(widgetPath, widgetName + '.html'));
          var widgetContent = String(widgetBuf);
          var htmlCommentReg = /<!--[\s\S]*?-->/g;
          var paramClone = Object.create(param);
          var widgetParam = _.merge(paramClone, ViewHelper);
          widgetContent = widgetContent.replace(htmlCommentReg, '');
          // 开始处理js
          var widgetStartLine = -1;
          var widgetEndLine = -1;
          var scriptContent = '';
          widgetContent = widgetContent.split('\n');
          widgetContent.forEach(function (item, i) {
            if (/widget.scriptStart/i.test(item)) {
              widgetStartLine = i;
            }

            if (/widget.scriptEnd/i.test(item)) {
              widgetEndLine = i;
            }
          });
          scriptContent = widgetContent.splice(widgetStartLine + 1, widgetEndLine - widgetStartLine - 1).join('\n');
          scriptContent = _.template(scriptContent)(paramClone);
          ScriptPool.add(widgetName, scriptContent);
          widgetHtmlStr = _.template(widgetContent.join('\n'))(widgetParam);
        } catch (err) {
          console.log(ViewHelper.tpl, widgetName, err.stack);
        }
      } else {
        gutil.log(gutil.colors.red(ViewHelper.tpl + ' widget ' + widgetName + ' can not find!'));
      }
      return widgetHtmlStr;
    },
    scriptStart: function () {

    },

    scriptEnd: function () {

    }
  }
};

module.exports = inject;
