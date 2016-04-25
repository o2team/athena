/**
* @fileoverview server模式专用，代码扫描获取依赖关系，解析widget.load
* @author  liweitao@jd.com
*/

'use strict';

var through2 = require('through2');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');

var Util = require('../../util');

require('../../util/object_assign');

var ScriptPool = {
  cache: [],
  add: function (name, content) {
    this.cache.push({
      name: name,
      script: content
    });
  },

  create: function (name) {
    this.cache.push({
      name: name
    });
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

var widgetIndex = 0;


function scan (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined,
    shtml: {}
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
    ScriptPool.cache = [];
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var filename = path.basename(file.path);
      fileMapJson.include[filename] = {
        'css': [],
        'js': []
      };
      var fileString = generateFileHtml(file, config, fileMapJson, dataJson);
      // 将js代码片段写入html中
      fileString = setScript(fileString);
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

function getWidgetPath (modulePath, widgetName) {
  return path.join(modulePath, 'dist', '_', 'widget', widgetName);
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

// 将js代码片段写入html中
function setScript (fileContent) {
  var lines = fileContent.split('\n');
  var includeScriptEndPlaceHolder = -1;
  lines = lines.map(function (item, i) {
    if (/<!--[\s\S]?includeScriptEndPlaceHolder[\s\S]*?-->/g.test(item)) {
      includeScriptEndPlaceHolder = i;
      return '';
    }
    return item;
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
  return beautifyHtml(lines.join('\n'), { indent_size: 2, max_preserve_newlines: 1 });
}

var ViewHelper = {
  tpl: null,
  getCSS: function (resourceName, moduleName) {
    var cssName = path.basename(ViewHelper.tpl, path.extname(ViewHelper.tpl));
    if (typeof moduleName !== 'string') {
      moduleName = ViewHelper.config.module;
    }

    if (resourceName) {
      // 必须为css
      var resArr = resourceName.split('.');
      if (!Util.regexps.css.test(resourceName)) {
        return;
      }
      cssName = resArr[0];
    }

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
    var jsName = path.basename(ViewHelper.tpl, path.extname(ViewHelper.tpl));
    var scriptPre = '';
    if (typeof moduleName !== 'string') {
      moduleName = ViewHelper.config.module;
    }

    if (resourceName) {
      // 必须为js
      var resArr = resourceName.split('.');
      if (!Util.regexps.js.test(resourceName)) {
        return;
      }
      jsName = resArr[0];
    }

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
      // 根据widgetName 和 module去寻找widget
      moduleName = moduleName ? moduleName : ViewHelper.config.module;
      param = param ? param : {};
      var modulePath = path.join(ViewHelper.config.cwd, moduleName);
      var widgetPath = getWidgetPath(modulePath, widgetName);
      var widgetHtmlStr = '';
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
      widgetItem.widgetType = 'widget';
      if (fs.existsSync(widgetPath)) {
        try {
          var tplPath = path.join(widgetPath, widgetName + '.html');
          if (Util.existsSync(tplPath)) {
            var widgetBuf = fs.readFileSync(tplPath);
            var widgetContent = String(widgetBuf);
            var htmlCommentReg = /<!--[\s\S]*?-->/g;
            var paramClone = Object.create(param);
            var widgetParam = Object.assign(paramClone, ViewHelper);
            widgetContent = widgetContent.replace(htmlCommentReg, '');
            // 开始处理js片段
            var widgetStartLine = -1;
            var widgetEndLine = -1;
            var scriptContent = '';
            widgetContent = widgetContent.split('\n');
            widgetContent.unshift('<!-- <athena widget:' + moduleName + '/' + 'widget' + '/' + widgetName + '> -->');
            widgetContent.push('<!-- <athena widget:/' + moduleName + '/' + 'widget' + '/' + widgetName + '> -->');
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
      if (widgets.indexOf(widgetItem.widgetName) < 0) {
        ViewHelper.mapJson.dependency[ViewHelper.tpl].push(widgetItem);
      }
      return widgetHtmlStr;
    },

    // 加载widget楼层组件
    loadFloor: function (widgetName, param, moduleName) {
      // 根据widgetName 和 module去寻找widget
      moduleName = moduleName ? moduleName : ViewHelper.config.module;
      param = param ? param : {};
      widgetIndex++;
      var modulePath = path.join(ViewHelper.config.cwd, moduleName);
      var widgetPath = getWidgetPath(modulePath, widgetName);
      var widgetHtmlStr = '';
      var widgetItem = {
        widgetName: widgetName,
        module: moduleName,
        isFloor: true,
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
      widgetItem.widgetType = 'floor';
      if (fs.existsSync(widgetPath)) {
        try {
          var tplPath = path.join(widgetPath, widgetName + '.html');
          if (Util.existsSync(tplPath)) {
            var widgetBuf = fs.readFileSync(tplPath);
            var widgetContent = String(widgetBuf);
            var htmlCommentReg = /<!--[\s\S]*?-->/g;
            var paramClone = Object.create(param);
            var widgetParam = Object.assign(paramClone, ViewHelper);
            widgetContent = widgetContent.replace(htmlCommentReg, '');
            var floorIdReg = /\{[\s]*\$portal_floor_id[\s]*\}/g;
            var literalReg = /{literal}([\s\S]*){\/literal}/g;
            var testData = {};
            var testDataFile = path.join(widgetPath, 'data.json');
            if (Util.existsSync(testDataFile)) {
              try {
                testData = JSON.parse(String(fs.readFileSync(testDataFile)));
              } catch (ex) {
                testData = {};
              }
            }
            
            // 去掉{literal}{/literal}，同时解析出各个cell对应的数据
            widgetContent = widgetContent.replace(literalReg, function (m, $1) {
              return $1;
            }).replace(Util.regexps.doubleBraceInterpolate, function (m, $1) {
              if ($1.indexOf('cell_') >= 0) {
                var cellArr = [];
                var cellData = [];
                if ($1.indexOf('*') >= 0) {
                  cellArr = $1.split('*');
                  for (var i = 0; i < cellArr[1]; i++) {
                    cellData.push(testData[cellArr[0]]);
                  }
                } else {
                  cellData.push(testData[$1]);
                }
                return JSON.stringify(cellData);
              }
              return m;
            }).replace(floorIdReg, widgetIndex);
            // 开始处理js片段
            var widgetStartLine = -1;
            var widgetEndLine = -1;
            var scriptContent = '';
            widgetContent = widgetContent.split('\n');
            widgetContent.unshift('<!-- <athena widget:' + moduleName + '/' + 'widget' + '/' + widgetName + '> -->');
            widgetContent.push('<!-- <athena widget:/' + moduleName + '/' + 'widget' + '/' + widgetName + '> -->');
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
          }
        } catch (err) {
          gutil.log(gutil.colors.red('页面 ' + ViewHelper.tpl + ' 引用楼层 ' + widgetName + ' 的模板中存在语法错误！'));
          throw err;
        }
        widgetItem.exists = true;
      } else {
        widgetItem.exists = false;
        gutil.log(gutil.colors.red(ViewHelper.tpl + ' 楼层 ' + widgetName + ' can not find!'));
      }
      if (widgets.indexOf(widgetItem.widgetName) < 0) {
        ViewHelper.mapJson.dependency[ViewHelper.tpl].push(widgetItem);
      }
      return widgetHtmlStr;
    },

    scriptStart: function () {

    },

    scriptEnd: function () {

    }
  }
};

module.exports = scan;
