/**
* @fileoverview server模式专用，代码扫描获取依赖关系，解析widget.load
* @author  liweitao
*/

'use strict';

var through2 = require('through2');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');

require('jsmart');

var Util = require('../../util');

require('../../util/object_assign');

var exludeResource = {
  js: [],
  css: []
};

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
var needBeauty = true;

function scan (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined,
    isRelease: false,
    beauty: false,
    needScript: true,
    onProcessTpl: null
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
      if (config.needScript) {
        // 将js代码片段写入html中
        fileString = setScript(fileString);
        if (config.beauty || needBeauty) {
          fileString = beautifyHtml(fileString, { indent_size: 2, max_preserve_newlines: 1 });
        }
      }
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
    fs.writeFileSync(path.join(dest, '_exlude_resource.json'), JSON.stringify(exludeResource, null, 2));
    callback();
  });
  return stream;
}

function getWidgetPath (modulePath, widgetName) {
  if (!widgetName) {
    return '';
  }
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
  return lines.join('\n');
}

function loadWidget (widgetName, param, moduleName, onProcessContent, onProcessScript) {
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
        if (_.isFunction(onProcessScript)) {
          scriptContent = onProcessScript(scriptContent);
        }
        ScriptPool.add(widgetName, scriptContent);
        widgetHtmlStr = _.template(widgetContent.join('\n'))(widgetParam);
        if (_.isFunction(onProcessContent)) {
          widgetHtmlStr = onProcessContent(widgetPath, widgetHtmlStr, widgetItem);
        }
        if (_.isFunction(ViewHelper.config.onProcessTpl)) {
          widgetHtmlStr = ViewHelper.config.onProcessTpl(widgetHtmlStr);
        }
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
}

var ViewHelper = {
  tpl: null,
  getCSS: function (resourceName, moduleName, onlyPage) {
    var cssName = path.basename(ViewHelper.tpl, path.extname(ViewHelper.tpl));
    onlyPage = onlyPage || false;
    if (typeof moduleName !== 'string') {
      moduleName = ViewHelper.config.module;
    }

    if (resourceName) {
      // 必须为css
      if (!Util.regexps.css.test(resourceName)) {
        return;
      }
      cssName = path.basename(resourceName, path.extname(resourceName));
    }

    resourceName = cssName + '.css';
    if (resourceName && moduleName) {
      return '<%= getCSS(\'' + resourceName + '\', \'' + moduleName + '\', ' + onlyPage + ') %>';
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
  getJS: function (resourceName, moduleName, onlyPage) {
    var jsName = path.basename(ViewHelper.tpl, path.extname(ViewHelper.tpl));
    onlyPage = onlyPage || false;
    var scriptPre = '';
    if (typeof moduleName !== 'string') {
      moduleName = ViewHelper.config.module;
    }

    if (resourceName) {
      // 必须为js
      if (!Util.regexps.js.test(resourceName)) {
        return;
      }
      jsName = path.basename(resourceName, path.extname(resourceName));
    }

    resourceName = jsName + '.js';
    if (resourceName && moduleName) {
      scriptPre = '<%= getJS(\'' + resourceName + '\', \'' + moduleName + '\', ' + onlyPage + ') %>';
    } else if (resourceName && !moduleName) {
      scriptPre = '<%= getJS(\'' + resourceName + '\') %>';
    } else if (!resourceName && !moduleName) {
      scriptPre =  '<%= getJS() %>';
    }
    return scriptPre + '\n' + '<!-- includeScriptEndPlaceHolder -->';
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

  getDomain: function () {
    var appConf = require(ViewHelper.config.cwd, 'app-conf');
    if (ViewHelper.config.isRelease) {
      var comboConf = appConf.comboConf;
      if (!comboConf) {
        throw new Error('app-conf.js中缺少comboConf配置！');
      }
      var serverConf = appConf.comboConf.server;
      if (!serverConf) {
        throw new Error('app-conf.js中comboConf配置不完整！');
      }
      return Util.urlJoin(serverConf.onlineDomain, serverConf.shortPath);
    }
  },

  widget: {
    name: '',
    str: '',
    // 加载widget组件
    load: function (widgetName, param, moduleName) {
      return loadWidget(widgetName, param, moduleName);
    },

    embed: function (widgetName, param, moduleName) {
      return loadWidget(widgetName, param, moduleName);
    },

    // 加载widget楼层组件
    loadFloor: function (widgetName, param, moduleName) {
      needBeauty = false;
      return loadWidget(widgetName, param, moduleName, function (widgetPath, widgetContent, widget) {
        var floorIdReg = /\{[\s]*\$portal_floor_id[\s]*\}/g;
        var literalReg = /{literal}([\s\S]*){\/literal}/g;
        var testDataFile = path.join(widgetPath, 'data.json');
        var testData = Util.readJsonFile(testDataFile);
        widget.widgetType = 'floor';
        if (_.isEmpty(testData)) {
          gutil.log(gutil.colors.red('测试数据为空！请检查data.json文件！'));
          return widgetContent;
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
        
        return widgetContent;
      }, function (scriptContent) {
        var floorIdReg = /\{[\s]*\$portal_floor_id[\s]*\}/g;
        return scriptContent.replace(floorIdReg, widgetIndex);
      });
    },
    
    // 加载楼层组件使用smarty语法编译
    loadFloorSmarty: function (widgetName, param, moduleName) {
      needBeauty = false;
      return loadWidget(widgetName, param, moduleName, function (widgetPath, widgetContent, widget) {
        var testDataFile = path.join(widgetPath, 'custom_data.json');
        var compiledTpl = new jSmart(widgetContent);
        var testData = Util.readJsonFile(testDataFile);
        widget.widgetType = 'floor';
        if (_.isEmpty(testData)) {
          gutil.log(gutil.colors.red('测试数据为空！请检查custom_data.json文件！'));
          return widgetContent;
        }
        // 测试数据预置变量
        testData.portal_floor_id = 0;
        testData.portal_cell_id = 0;
        widgetContent = compiledTpl.fetch(testData);
        return widgetContent;
      });
    },

    scriptStart: function () {

    },

    scriptEnd: function () {

    }
  }
};

module.exports = scan;
