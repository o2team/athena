/**
* @fileoverview client模式专用，代码扫描获取依赖关系，解析widget.load
* @author  liweitao
*/

'use strict';

var through2 = require('through2');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');
var Util = require('../../util');

require('../../util/object_assign');

var exludeResource = {
  js: [],
  css: []
};

var widgetContentCache = {};

// 收集脚本池
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

var ViewHelper = {
  mapJson: null,
  dataJson: null,
  tpl: null,
  // 输出样式表链接
  getCSS: function (resourceName, moduleName, needCombo) {
    // 默认为当前页面的css名称
    var cssName = path.basename(ViewHelper.tpl,  path.extname(ViewHelper.tpl));
    needCombo = (_.isNull(needCombo) || _.isUndefined(needCombo)) ? true : needCombo;
    if (!moduleName || (moduleName === ViewHelper.config.module)) {
      moduleName = ViewHelper.config.module;
    }
    if (!ViewHelper.mapJson.include[ViewHelper.tpl]) {
      ViewHelper.mapJson.include[ViewHelper.tpl] = {
        'css': [],
        'js': []
      };
    }
    
    if (resourceName) {
      // 必须为css
      if (!Util.regexps.css.test(resourceName)) {
        return;
      }
      var cssDirReg = /^\/{0,}css\/(.*)/;
      var match = resourceName.match(cssDirReg);
      if (match !== null) {
        resourceName = match[1];
      }
      cssName = resourceName.replace(path.extname(resourceName), '');
    }
    ViewHelper.mapJson.include[ViewHelper.tpl].css.push({
      name: cssName + '.css',
      module: moduleName
    });
    var linkText = '';
    var cssUrl = 'css/' + cssName + '.css';

    cssUrl = '/' + moduleName + '/' + cssUrl;
    if (ViewHelper.config.useShtml && needCombo) {
      if (needCombo === 'inline') {
        linkText = '<link rel="stylesheet" type="text/css" href="' + cssUrl + '" combo-use inline>';
      } else {
        linkText = '<link rel="stylesheet" type="text/css" href="' + cssUrl + '" combo-use>';
      }
    } else {
      linkText = '<link rel="stylesheet" type="text/css" href="' + cssUrl + '">';
    }

    return linkText;
  },
  // 输出js引用链接
  getJS: function (resourceName, moduleName, needCombo) {
    // 默认为当前页面的js名称
    var jsName = path.basename(ViewHelper.tpl,  path.extname(ViewHelper.tpl));
    needCombo = (_.isNull(needCombo) || _.isUndefined(needCombo)) ? true : needCombo;
    if (!moduleName || (moduleName === ViewHelper.config.module)) {
      moduleName = ViewHelper.config.module;
    }
    if (!ViewHelper.mapJson.include[ViewHelper.tpl]) {
      ViewHelper.mapJson.include[ViewHelper.tpl] = {
        'css': [],
        'js': []
      };
    }
    if (resourceName) {
      // 必须为js
      if (!Util.regexps.js.test(resourceName)) {
        return;
      }
      var jsDirReg = /^\/{0,}js\/(.*)/;
      var match = resourceName.match(jsDirReg);
      if (match !== null) {
        resourceName = match[1];
      }
      jsName = resourceName.replace(path.extname(resourceName), '');
    }
    ViewHelper.mapJson.include[ViewHelper.tpl].js.push({
      name: jsName + '.js',
      module: moduleName
    });
    var scriptText = '';
    var jsUrl = 'js/' + jsName + '.js';
    jsUrl = '/' + moduleName + '/' + jsUrl;
    if (ViewHelper.config.useShtml && needCombo) {
      if (needCombo === 'inline') {
        scriptText = '<script src="' + jsUrl + '" combo-use inline></script>';
      } else {
        scriptText = '<script src="' + jsUrl + '" combo-use></script>';
      }
    } else {
      scriptText = '<script src="' + jsUrl + '"></script>';
    }
    return scriptText + '\n' + '<!-- includeScriptEndPlaceHolder -->';
  },
  inline: function (src, moduleName) {
    if (arguments.length === 0) {
      return '';
    }
    var config = ViewHelper.config;
    if (Util.regexps.url.test(src)) {
      if (arguments[1] === 'debug' && !config.serve) {
        return '';
      }
      return '__inline("' + src + '")';
    }
    if (!moduleName) {
      moduleName = config.module;
    }
    var modulePath = path.join(config.cwd, moduleName);
    var staticPath = require(path.join(modulePath, 'static-conf.js')).staticPath;
    if (!_.isEmpty(staticPath)) {
      for (var key in staticPath) {
        if (Util.regexps.css.test(key)) {
          staticPath[key].forEach(function (item) {
            item = item.indexOf('/') === 0 ? item.substring(1) : item;
            var itemArr = item.split('/');
            // 说明是引用组件的资源
            if (itemArr[0] === 'widget') {
              exludeResource.css.push({
                module: moduleName,
                file: item
              });
            }
          });
        }
        if (Util.regexps.js.test(key)) {
          staticPath[key].forEach(function (item) {
            item = item.indexOf('/') === 0 ? item.substring(1) : item;
            var itemArr = item.split('/');
            // 说明是引用组件的资源
            if (itemArr[0] === 'widget') {
              exludeResource.js.push({
                module: moduleName,
                file: item
              });
            }
          });
        }
      }
    }
    return '__inline("' + src + ',' + moduleName + '")';
  },
  uri: function (src) {
    return '__uri("' + src + '")';
  },
  __uri: function (src) {
    return '__uri("' + src + '")';
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

      if (fs.existsSync(widgetPath)) {
        try {
          var tplPath = path.join(widgetPath, widgetName + '.html');
          if (Util.existsSync(tplPath)) {
            var widgetContent = '';
            if (widgetContentCache[tplPath]) {
              widgetContent = widgetContentCache[tplPath];
            } else {
              var widgetBuf = fs.readFileSync(tplPath);
              widgetContent = String(widgetBuf);
              widgetContentCache[tplPath] = widgetContent;
            }
            var htmlCommentReg = /<!--[\s\S\r\n\f]*?-->/g;
            var paramClone = Object.create(param);
            var widgetParam = Object.assign(paramClone, ViewHelper);
            widgetContent = widgetContent.replace(htmlCommentReg, function (m, $1) {
              if (m.indexOf('\n') >=0 && (m.indexOf('@author') >= 0 || m.indexOf('@description') >= 0)) {
                return '';
              }
              return m;
            });
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
            widgetHtmlStr = _.template(widgetContent.join('\n'))(widgetParam);
            if (!_.isEmpty(ViewHelper.config.useInclude.useIncludeWidgetList)) {
              var useInclude = ViewHelper.config.useInclude;
              var useIncludeWidgetList = useInclude.useIncludeWidgetList;
              var fileChunk = useInclude.fileChunk;
              useIncludeWidgetList.forEach(function (item) {
                if (item.widgetName === widgetName) {
                  var extname = path.extname(item.file);
                  var scriptFile = path.basename(item.file, extname) + '_script' + extname;
                  if (!/^\s*$/.test(widgetHtmlStr)) {
                    fileChunk[item.file].content = widgetHtmlStr;
                  } else {
                    fileChunk[item.file].content = '<!-- ' + item.file + ' -->';
                  }
                  if (!/^\s*$/.test(scriptContent)) {
                    fileChunk[scriptFile].content = scriptContent;
                  } else {
                    fileChunk[scriptFile].content = '<!-- ' + scriptFile + ' -->';
                  }
                  useInclude.isGenerate = true;
                  scriptContent = '<!--#include virtual="' + Util.urlJoin(useInclude.pathPrefix, scriptFile) + '"-->';
                  widgetHtmlStr = '<!--#include virtual="' + Util.urlJoin(useInclude.pathPrefix, item.file) + '"-->';
                }
              });
            }
            ScriptPool.add(widgetName, scriptContent);
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
    embed: function (widgetName, param, moduleName) {
      // 根据widgetName 和 moduleName去寻找widget
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

      if (fs.existsSync(widgetPath)) {
        try {
          var tplPath = path.join(widgetPath, widgetName + '.html');
          if (Util.existsSync(tplPath)) {
            var widgetContent = '';
            if (widgetContentCache[tplPath]) {
              widgetContent = widgetContentCache[tplPath];
            } else {
              var widgetBuf = fs.readFileSync(tplPath);
              widgetContent = String(widgetBuf);
              widgetContentCache[tplPath] = widgetContent;
            }
            var htmlCommentReg = /<!--[\s\S\r\n\f]*?-->/g;
            var paramClone = Object.create(param);
            var widgetParam = Object.assign(paramClone, ViewHelper);
            widgetContent = widgetContent.replace(htmlCommentReg, function (m, $1) {
              if (m.indexOf('\n') >=0 && (m.indexOf('@author') >= 0 || m.indexOf('@description') >= 0)) {
                return '';
              }
              return m;
            });
            // 处理js片段
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
            widgetContent.splice(widgetStartLine, widgetEndLine - widgetStartLine + 1);
            widgetHtmlStr = widgetContent.join('\n');
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
    scriptStart: function () {

    },

    scriptEnd: function () {

    }
  }
};

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
    module: undefined,
    useInclude: {},
    serve: false,
    useShtml: false
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

  exludeResource = {
    js: [],
    css: []
  };
  var mapJsonPath = path.join(config.cwd, config.module, 'dist', 'map.json');

  if (fs.existsSync(mapJsonPath)) {
    fileMapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
  }
  if (!config.serve && !_.isEmpty(config.useInclude.files)) {
    var useIncludeWidgetList = [];
    var includeFiles = config.useInclude.files;
    var fileChunk = {};
    try {
      fileChunk = JSON.parse(String(fs.readFileSync(path.join(config.cwd, '.' + config.useInclude.folder + '.json'))));
    } catch (e) {
      fileChunk = {};
    }
    config.folder = config.folder || 'include';
    for (var i in includeFiles) {
      var extname = path.extname(i);
      var scriptFile = path.basename(i, extname) + '_script' + extname;
      useIncludeWidgetList.push({
        file: i,
        widgetName: includeFiles[i].widget,
        module: includeFiles[i].module
      });
      if (!fileChunk[i] && !fileChunk[scriptFile]) {
        fileChunk[i] = {module: includeFiles[i].module};
        fileChunk[scriptFile] = {module: includeFiles[i].module};
      }
    }
    config.useInclude.useIncludeWidgetList = useIncludeWidgetList;
    config.useInclude.fileChunk = fileChunk;
  }
  var stream = through2.obj(function (file, encoding, callback) {
    ScriptPool.cache = [];
    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isBuffer()) {
      var fileString = generateFileHtml(file, config, fileMapJson, dataJson);
      fileString = setScript(fileString);
      file.contents = new Buffer(fileString);
      this.push(file);
      callback();
    } else if (file.isStream()){
      return callback(null, file);
    }
  }, function (callback) {
    widgetContentCache = {};
    var modulePath = path.join(config.cwd, config.module);
    var dest = path.join(modulePath, 'dist');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.writeFileSync(path.join(dest, 'map.json'), JSON.stringify(fileMapJson, null, 2));
    fs.writeFileSync(path.join(dest, 'data.json'), JSON.stringify(dataJson, null, 2));
    fs.writeFileSync(path.join(dest, '_exlude_resource.json'), JSON.stringify(exludeResource, null, 2));
    if (!config.serve && !_.isEmpty(config.useInclude.files)) {
      var useInclude = config.useInclude;
      var fileChunk = useInclude.fileChunk;
      if (useInclude.isGenerate) {
        fs.writeFileSync(path.join(config.cwd, '.' + useInclude.folder + '.json'), JSON.stringify(fileChunk, null, 2));
      }
    }
    callback();
  });
  return stream;
}

module.exports = resourceScan;
