'use strict';

var through = require('through-gulp');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');
var cheerio = require('cheerio');

var fileMapJson = {
  dependency: {},
  include: {}
};
var config = {};

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

var ViewHelper = {
  tpl: null,
  // 输出样式表链接
  getCSS: function (resourceName, moduleName) {
    // 默认为当前页面的css名称
    var cssName = path.basename(ViewHelper.tpl, '.html');
    var includeOtherModule = false;
    if (moduleName && (moduleName !== config.module)) {
      includeOtherModule = true;
    } else {
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
    var combouse = '/' + moduleName + '/css/' + cssName + '.min.css';
    var cssUrl = 'css/' + cssName + '.css';
    if (includeOtherModule) {
      cssUrl = '../' + moduleName + '/' + cssUrl;
    }
    fileMapJson.include[ViewHelper.tpl].css.push({
      name: cssName + '.css',
      module: moduleName
    });
    var linkText = '<link rel="stylesheet" type="text/css" href="' + cssUrl + '" combo-use="' + combouse + '">';
    return linkText;
  },
  // 输出js引用链接
  getJS: function (resourceName, moduleName) {
    // 默认为当前页面的js名称
    var jsName = path.basename(ViewHelper.tpl, '.html');
    var includeOtherModule = false;
    if (moduleName && (moduleName !== config.module)) {
      includeOtherModule = true;
    } else {
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
    var jsUrl = 'js/' + jsName + '.js';
    if (includeOtherModule) {
      jsUrl = '../' + moduleName + '/' + jsUrl;
    }
    fileMapJson.include[ViewHelper.tpl].js.push({
      name: jsName + '.js',
      module: moduleName
    });
    var scriptText = '<script src="' + jsUrl + '"></script>';
    return scriptText;
  },
  widget: {
    name: '',
    str: '',
    // 加载widget组件
    load: function (widgetName, param, module) {
      // 根据widgetName 和 module去寻找widget
      module = module ? module : config.module;
      param = param ? param : {};
      var modulePath = config.cwd + '/' + module;
      var widgetPath = getWidgetPath(modulePath, widgetName);
      var widgetItem = {
        widgetName: widgetName,
        param: param,
        module: module
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
          ScriptPool.add(widgetItem.widgetName, scriptContent);
          widgetHtmlStr = beautifyHtml(_.template(widgetContent.join('\n'))(widgetParam), { indent_size: 2, max_preserve_newlines: 1 });
        } catch (err) {
          console.log(ViewHelper.tpl, widgetItem.widgetName, err);
        }
      } else {
        widgetItem.exists = false;
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

// 将js代码片段写入html中
function setScript (fileContent) {
  var $ = cheerio.load(fileContent, { decodeEntities: false });
  var $body = $('body');
  ScriptPool.cache.forEach(function (item) {
    $body.append(item.script + '\n\n');
  });

  return beautifyHtml($.html(), { indent_size: 2, max_preserve_newlines: 1 });
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
      fileString = setScript(fileString);
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
