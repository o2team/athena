/**
* @fileoverview client模式专用，资源地址替换
* @author  liweitao
*/

'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var gutil = require('gulp-util');
var through2 = require('through2');
var mkdirp = require('mkdirp');
var beautify = require('js-beautify');
var beautifyHtml = beautify.html;
var request = require('sync-request');

var Util = require('../../util');

var mapJSONCache = {};
var comboConf = null;

function replace(opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined,
    replaceType: 'local',
    serve: false,
    pack: false,
    compress: false,
    release: false
  }, opts);

  config.base64Opts = config.base64Opts || {
    enable: false,
    exclude: [],
    size: 5000
  };

  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at replace!'));
    return;
  }
  var includeJson = {};
  config.replaceType = config.replaceType ? config.replaceType : 'local';

  var modulePath = path.join(config.cwd, config.module);
  // 读取module-conf配置文件
  config.moduleConf = require(path.join(modulePath, 'module-conf'));
  config.appConf = require(path.join(config.cwd, 'app-conf'));
  comboConf = (typeof config.appConf.comboConf === 'object') && !_.isEmpty(config.appConf.comboConf) ? config.appConf.comboConf : {
    mode: 'client'
  };
  var resourcePrefix = null;
  var mapJson = null;
  var gMapJson = null;
  try {
    mapJson = JSON.parse(fs.readFileSync(path.join(modulePath, 'dist', 'map.json')).toString());
  } catch (e) {
    mapJson = null;
  }
  if (!config.serve) {
    try {
      gMapJson = JSON.parse(fs.readFileSync(path.join(Util.getAthenaPath(), 'cache', 'common', config.appConf.app + '_' + config.appConf.common + '.json')).toString());
    } catch (e) {
      gMapJson = null;
    }
  }

  if (!_.isEmpty(mapJson)) {
    mapJSONCache[config.module] = mapJson;
  }
  if (!_.isEmpty(gMapJson)) {
    mapJSONCache[config.appConf.common] = gMapJson;
  }
  if (config.appConf && config.moduleConf) {
    var deployObj = config.appConf.deploy;
    resourcePrefix = {};
    for (var key in deployObj) {
      if (key === 'local') {
        var localUrl = '/' + config.appConf.app + '/';
        resourcePrefix.local = deployObj.local ? (deployObj.local.fdPath ? Util.urlJoin(deployObj.local.fdPath, localUrl) : localUrl) : localUrl;
      } else {
        resourcePrefix[key] = '//' + Util.urlJoin(config.domain || deployObj[key].domain, config.fdPath || deployObj[key].fdPath, config.appConf.app, '/')
      }
    }
  }

  if (config.release) {
    resourcePrefix['release-mode'] = comboConf.client.onlineDomain + Util.urlJoin(comboConf.client.shortPath, '/');
    config.replaceType = 'release-mode';
  }

  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var extname = path.extname(file.path);
      var basename = path.basename(file.path);
      includeJson[basename] = [];
      if (Util.regexps.js.test(extname)) {
        file.contents = new Buffer(processJs(basename, file.contents.toString(), resourcePrefix[config.replaceType], config, includeJson));
      } else if (Util.regexps.css.test(extname)) {
        file.contents = new Buffer(processCss(basename, file.contents.toString(), resourcePrefix[config.replaceType], config, includeJson));
      } else if (Util.regexps.tpl.test(extname)) {
        file.contents = new Buffer(processHtml(basename, file.contents.toString(), resourcePrefix[config.replaceType], config, includeJson));
      }
      this.push(file);
      callback();
    } else if (file.isStream()){
      return callback(null, file);
    }
  }, function (callback) {
    var mapJsonInclude = mapJson.include;
    if (mapJsonInclude && (typeof mapJsonInclude === 'object')) {
      for (var i in mapJsonInclude) {
        var pageInclude = includeJson[i];
        if (pageInclude && pageInclude.sort) {
          mapJsonInclude[i].images = pageInclude;
        }
        var mapJsonIncludeCss = mapJsonInclude[i].css;
        if (mapJsonIncludeCss && mapJsonIncludeCss.forEach) {
          mapJsonIncludeCss.map(function (item) {
            var name = item.name;
            if (includeJson[name] && includeJson[name].sort) {
              item.images = includeJson[name];
            }
            return item;
          });
        }
        var mapJsonIncludeJs = mapJsonInclude[i].js;
        if (mapJsonIncludeJs && mapJsonIncludeJs.forEach) {
          mapJsonIncludeJs.map(function (item) {
            var name = item.name;
            if (includeJson[name] && includeJson[name].sort) {
              item.images = includeJson[name];
            }
            return item;
          });
        }
      }
      var dest = path.join(modulePath, 'dist');
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }
      fs.writeFileSync(path.join(dest, 'map.json'), JSON.stringify(mapJson, null, 2));
    }
    callback();
  });

  return stream;
}

function processHtml (filename, contents, resourcePrefix, config, includeJson) {
  contents = Util.processHtml(contents, function (value, type) {
    if (!type || type === 'url') {
      value = transmitResource(filename, value, resourcePrefix, config, includeJson, true);
    } else if (type === 'content') {
      value = printResource(filename, value, resourcePrefix, config, includeJson);
    }
    return value;
  });
  return beautifyHtml(contents, { indent_size: 2, max_preserve_newlines: 1 });
}

function processJs (filename, contents, resourcePrefix, config, includeJson) {
  contents = Util.processJs(contents, function (value, type) {
    if (!type || type === 'url') {
      value = transmitResource(filename, value, resourcePrefix, config, includeJson, true);
    } else if (type === 'content') {
      value = printResource(filename, value, resourcePrefix, config, includeJson);
    } else if (type === 'hash') {
      value = getHashName(filename, value, config);
    }
    return value;
  });
  return contents;
}

function processCss (filename, contents, resourcePrefix, config, includeJson) {
  contents = Util.processCss(contents, function (value, type) {
    if (!type || type === 'url') {
      value = transmitResource(filename, value, resourcePrefix, config, includeJson, true);
    } else if (type === 'content') {
      value = printResource(filename, value, resourcePrefix, config, includeJson);
    }
    return value;
  });
  return contents;
}

function transmitResource(filename, value, resourcePrefix, config, includeJson, needMd5) {
  var vStart = '';
  var vEnd = '';
  var extname = path.extname(value);
  if (value.indexOf('\"') === 0 || value.indexOf('\'') === 0) {
    vStart = value[0];
    vEnd = value[value.length - 1];
    value = value.replace(/^\"|\"$/g, '').replace(/^\'|\'$/g, '');
  }
  if (value === 'domain_prefix') {
    return vStart + resourcePrefix + Util.urlJoin(comboConf.client.shortPath) + vEnd;
  }
  var dirname = path.dirname(value);
  var dirnameArr = dirname.split('/');
  var imagesIndex = dirnameArr.indexOf('images');
  var cssIndex = dirnameArr.indexOf('css');
  var jsIndex = dirnameArr.indexOf('js');
  if (!Util.regexps.url.test(value) && value.length > 0
    && value.indexOf('data:image') < 0
    && typeof extname === 'string'
    && extname.length > 0
    && (imagesIndex >= 0 || cssIndex >= 0 || jsIndex >= 0)) {
    var index = Math.max(imagesIndex, cssIndex, jsIndex);
    var valueInfo = trackResource(filename, value, index, config);
    value = valueInfo.value.replace(/\\/ig, '/');
    var moduleName = valueInfo.module;
    var mapJSONModuleCache = mapJSONCache[moduleName];

    var originalPath = value;

    if (!mapJSONModuleCache || _.isEmpty(mapJSONModuleCache)) {
      mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(path.join(config.cwd, moduleName, 'dist', 'map.json')).toString());
    }
    if (config.pack || config.compress) {
      if (moduleName !== config.module) {
        value = '../' + moduleName + '/' + value;
      }
      if (imagesIndex >= 0  && !(Util.regexps.js.test(filename) || Util.regexps.tpl.test(filename))) {
        value = '../' + value;
      }
    }

    if (Util.regexps.media.test(value) || Util.regexps.js.test(value) || Util.regexps.css.test(value)) {
      var isResExist = false;
      includeJson[filename] = includeJson[filename] ? includeJson[filename] : [];
      includeJson[filename].forEach(function (item) {
        if (item.res === value) {
          isResExist = true;
        }
      });
      if (!isResExist) {
        includeJson[filename].push({
          res: value,
          module: moduleName
        });
      }
    }

    var pathname = path.join(path.join(config.cwd, moduleName, 'dist/output', originalPath), '..', path.basename(value));
    var query = Util.getQueryObj(pathname);
    var size;
    var _pathname = pathname.split('?')[0];
    if (Util.regexps.images.test(path.basename(_pathname)) && Util.existsSync(_pathname)) {
      // 判断是否有__inline标或者是打开了base64开关被excluded
      var baseExclude = config.base64Opts.exclude;
      if (query.__inline || config.base64Opts.enable && (!baseExclude || _.isArray(baseExclude) && baseExclude.indexOf(originalPath) === -1)) {
        try {
          size = fs.statSync(_pathname).size;
          if (query.__inline || size < config.base64Opts.size) {
            return vStart + Util.transform2DataURI(_pathname) + vEnd;
          }
        }
        catch (e) {
          gutil.log(gutil.colors.red('无法转base64，文件' + _pathname + '没有找到！'));
          return vStart + value + vEnd;
        }
      }
    }
    var mapJson = mapJSONCache[moduleName];
    if (mapJson && needMd5 && !config.pack) {
      value = Util.getHashName(value, mapJson);
    }
    if (!(config.pack || config.compress)) {
      value = resourcePrefix + moduleName + '/' + value;
    }
  }
  value = vStart + value + vEnd;
  return value;
}

function trackResource(filename, value, index, config) {
  value = value.split('/').splice(index).join('/');
  var distPath = path.join(config.cwd, config.module, 'dist', '_static');
  var gDistPath = path.join(config.cwd, config.appConf.common, 'dist', '_static');
  var valueParse = Util.getUrlParseSplit(value);
  var splitAfter = valueParse.split;
  var newValue = valueParse.pathname;
  value = newValue;
  var resourcePath = path.join(distPath, value);
  var gResourcePath = path.join(gDistPath, value);
  var moduleName = '';

  // 优先判断资源是否在当前模块
  // 在当前模块找到
  if (Util.existsSync(resourcePath)) {
    moduleName = config.module;
  } else {
    // 在公共模块找到
    if (Util.existsSync(gResourcePath)) {
      moduleName = config.appConf.common;
    } else {
      // 若在公共模块也没有找到，则认为资源是不存在的资源，将模块设置成当前模块
      moduleName = config.module;
      gutil.log(gutil.colors.red('文件 ' + filename + ' 中引用资源 ' + value + ' 没有找到！'));
    }
  }
  if (splitAfter) {
    value += splitAfter;
  }
  return {
    module: moduleName,
    value: value
  };
}

function printResource (filename, value, resourcePrefix, config, includeJson) {
  var res = '';
  var fpath = '';
  if (value.indexOf('\"') === 0 || value.indexOf('\'') === 0) {
    value = value.replace(/^\"|\"$/g, '').replace(/^\'|\'$/g, '');
  }
  var valueArr = [];
  var moduleName = config.module;
  if (value.indexOf(',') >= 0) {
    valueArr = value.split(',');
    value = valueArr[0].replace(Util.regexps.blank, '');
    moduleName = valueArr[1].replace(Util.regexps.blank, '');
  }
  // URL
  if (Util.regexps.url.test(value)) {
    try {
      var result = request('GET', value);
      res = String(result.getBody());
    } catch (error) {
      res = '';
      gutil.log(gutil.colors.red('链接 ' + value + ' 请求出错，请检查后重试！'));
      return res;
    }
    return printLocalResource(filename, value, resourcePrefix, config, includeJson, null, res);
  }

  if (Util.regexps.css.test(value)) {
    fpath = path.join(config.cwd, moduleName, 'dist', '_static', 'css', value);
  } else if (Util.regexps.js.test(value)) {
    fpath = path.join(config.cwd, moduleName, 'dist', '_static', 'js', value);
  } else if (Util.regexps.images.test(value)) {
    fpath = path.join(config.cwd, moduleName, 'dist', '_static', 'images', value);
  } else {
    fpath = path.join(config.cwd, moduleName, 'dist', '_', value);
  }
  return printLocalResource(filename, value, resourcePrefix, config, includeJson, fpath);
}

function printLocalResource (filename, value, resourcePrefix, config, includeJson, fpath, content) {
  var res = '';
  if ((!path || !Util.existsSync(fpath)) && !content) {
    return gutil.log(gutil.colors.red('文件' + value + '并不存在！'));
  }
  if (fpath) {
    content = String(fs.readFileSync(fpath));
  }
  // 本地CSS
  if (Util.regexps.css.test(value)) {
    if (!Util.regexps.css.test(filename)) {
      res += '\n<style>\n';
      res += processCss(value, content, resourcePrefix, config, includeJson) + '\n';
      res += '</style>';
    } else {
      res += processCss(value, content, resourcePrefix, config, includeJson) + '\n';
    }
    return res;
  }
  // 本地JS
  if (Util.regexps.js.test(value)) {
    if (!Util.regexps.js.test(filename)) {
      res += '\n<script>\n';
      res += '/*filename=' + value + '*/\n';
      res += processJs(value, content, resourcePrefix, config, includeJson) + '\n';
      res += '</script>';
    } else {
      res += processJs(value, content, resourcePrefix, config, includeJson) + '\n';
    }
    return res;
  }
  // 本地HTML
  if (Util.regexps.tpl.test(value)) {
    res += '\n<!--filename=' + value + '-->\n';
    res += processHtml(value, content, resourcePrefix, config, includeJson) + '\n';
    return res;
  }
  // 本地图片
  if (Util.regexps.images.test(value)) {
    var _pathname = fpath.split('?')[0];
    res += Util.transform2DataURI(_pathname);
    return res;
  }
  // 其他文件
  res += '\n' + content;
  return res;
}

function getHashName (filename, value, config) {
  var vStart = '';
  var vEnd = '';
  var extname = path.extname(value);
  if (value.indexOf('\"') === 0 || value.indexOf('\'') === 0) {
    vStart = value[0];
    vEnd = value[value.length - 1];
    value = value.replace(/^\"|\"$/g, '').replace(/^\'|\'$/g, '');
  }
  var dirname = path.dirname(value);
  var dirnameArr = dirname.split('/');
  var imagesIndex = dirnameArr.indexOf('images');
  var cssIndex = dirnameArr.indexOf('css');
  var jsIndex = dirnameArr.indexOf('js');
  if (!Util.regexps.url.test(value) && value.length > 0
    && value.indexOf('data:image') < 0
    && typeof extname === 'string'
    && extname.length > 0
    && (imagesIndex >= 0 || cssIndex >= 0 || jsIndex >= 0)) {
    var index = Math.max(imagesIndex, cssIndex, jsIndex);
    var valueInfo = trackResource(filename, value, index, config);
    var moduleName = valueInfo.module;
    value = valueInfo.value.replace(/\\/ig, '/');
    var mapJSONModuleCache = mapJSONCache[moduleName];
    if (!mapJSONModuleCache || _.isEmpty(mapJSONModuleCache)) {
      mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(path.join(config.cwd, moduleName, 'dist', 'map.json')).toString());
    }

    var mapJson = mapJSONCache[moduleName];
    if (mapJson) {
      value = Util.getHashName(value, mapJson);
    }
  }
  return vStart + value + vEnd;
}

module.exports = replace;
