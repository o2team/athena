/**
* @fileoverview server模式专用，资源地址替换
* @author  liweitao@jd.com
*/

'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var gutil = require('gulp-util');
var through2 = require('through2');

var Util = require('../../util');

var mapJSONCache = {};
var appConf = null;
var comboConf = null;

function replace (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined,
    replaceType: 'local',
    serve: false,
    release: false
  }, opts);

  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at replace!'));
    return;
  }
  var includeJson = {};
  config.replaceType = config.replaceType ? config.replaceType : 'local';

  var modulePath = path.join(config.cwd, config.module);
  // 读取module-conf配置文件
  config.moduleConf = require(path.join(modulePath, 'module-conf'));
  appConf = require(path.join(config.cwd, 'app-conf'));
  comboConf = appConf.comboConf;
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
      gMapJson = JSON.parse(fs.readFileSync(path.join(Util.getAthenaPath(), 'cache', 'common', appConf.app + '_' + appConf.common + '.json')).toString());
    } catch (e) {
      gMapJson = null;
    }
  }

  if (!_.isEmpty(mapJson)) {
    mapJSONCache[config.module] = mapJson;
  }
  if (!_.isEmpty(gMapJson)) {
    mapJSONCache[appConf.common] = gMapJson;
  }
  if (appConf && config.moduleConf) {
    var deployObj = appConf.deploy;
    resourcePrefix = {};
    for (var key in deployObj) {
      if (key === 'local') {
        resourcePrefix.local = deployObj.local ? (deployObj.local.fdPath ? deployObj.local.fdPath : '/') : '/';
      } else {
        resourcePrefix[key] = '//' + Util.urlJoin(deployObj[key].domain, deployObj[key].fdPath);
      }
    }
  }
  if (config.release) {
    resourcePrefix['release-mode'] = comboConf.server.onlineDomain;
    config.replaceType = 'release-mode';
  }
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull() || file.isStream()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var extname = path.extname(file.path);
      var basename = path.basename(file.path);
      var fileContents = file.contents.toString();
      includeJson[basename] = [];
      if (Util.regexps.js.test(extname)) {
        file.contents = new Buffer(processJs(basename, fileContents, resourcePrefix[config.replaceType], config, includeJson));
      } else if (Util.regexps.css.test(extname)) {
        file.contents = new Buffer(processCss(basename, fileContents, resourcePrefix[config.replaceType], config, includeJson));
      } else if (Util.regexps.tpl.test(extname)) {
        file.contents = new Buffer(processHtml(basename, fileContents, resourcePrefix[config.replaceType], config, includeJson));
      }
      this.push(file);
      callback();
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
  contents = Util.processHtml(contents, function (value) {
    value = splitValue(filename, value, resourcePrefix, config, includeJson, true);
    return value;
  });
  return contents;
}

function processJs (filename, contents, resourcePrefix, config, includeJson) {
  contents = Util.processJs(contents, function (value) {
    value = splitValue(filename, value, resourcePrefix, config, includeJson, true);
    return value;
  });
  return contents;
}

function processCss (filename, contents, resourcePrefix, config, includeJson) {
  contents = Util.processCss(contents, function (value) {
    value = splitValue(filename, value, resourcePrefix, config, includeJson, true);
    return value;
  });
  return contents;
}

function splitValue (filename, value, resourcePrefix, config, includeJson, needMd5) {
  var vStart = '';
  var vEnd = '';
  if (value.indexOf('\"') >= 0 || value.indexOf('\'') >= 0) {
    vStart = value[0];
    vEnd = value[value.length - 1];
    value = value.replace(/\"/g, '').replace(/\'/g, '');
  }
  if (Util.regexps.url.test(value)) {
    value = vStart + value + vEnd;
    return value;
  }
  var valueArr = value.split(',');
  valueArr = valueArr.map(function (item, i) {
    var valueItem = item;
    var moduleName = undefined;
    if (item.indexOf(':') >= 0) {
      item = item.split(':');
      moduleName = item[0];
      valueItem = item[1];
    }
    return transmitResource(filename, valueItem, moduleName, config, includeJson, needMd5);
  });
  if (valueArr.length > 1) {
    value = vStart + resourcePrefix + Util.urlJoin(comboConf.server.shortPath, comboConf.server.flag, valueArr.join(',')) + vEnd;
  } else {
    value = vStart + resourcePrefix + Util.urlJoin(comboConf.server.shortPath, valueArr.join(',')) + vEnd;
  }
  return value;
}

// 处理单个资源
function transmitResource (filename, value, moduleName, config, includeJson, needMd5) {
  var valueInfo = trackResource(filename, value, config);
  value = valueInfo.value.replace(/\\/ig,'/');
  moduleName = valueInfo.module;
  var mapJSONModuleCache = mapJSONCache[moduleName];
  if (!mapJSONModuleCache || _.isEmpty(mapJSONModuleCache)) {
    mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(path.join(config.cwd, moduleName, 'dist', 'map.json')).toString());
  }
  if (Util.regexps.media.test(value)) {
    var isResExist = false;
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
  var mapJson = mapJSONCache[moduleName];
  if (mapJson && needMd5) {
    value = Util.getHashNameServer(value, mapJson);
  }
  value = '/' + moduleName + '/' + value;
  return value;
}

function trackResource (filename, value, config) {
  var dirname = path.dirname(value);
  var dirnameArr = dirname.split('/');
  // 多媒体资源都在images下
  if (Util.regexps.media.test(value)) {
    var imagesIndex = dirnameArr.indexOf('images');
    value = value.split('/').splice(imagesIndex).join('/');
  }
  var distPath = path.join(config.cwd, config.module, 'dist', '_static');
  var gDistPath = path.join(config.cwd, appConf.common, 'dist', '_static');
  // 带有查询字符串或hash
  var queryIndex = value.indexOf('?');
  var hashIndex = value.indexOf('#');
  var andIndex = value.indexOf('&');
  var splitIndex = Math.max(queryIndex, hashIndex, andIndex);
  if (queryIndex >= 0 && hashIndex >= 0 && andIndex >= 0) {
    splitIndex = Math.min(queryIndex, hashIndex, andIndex);
  }
  var splitAfter = null;
  if (splitIndex >= 0) {
    splitAfter = value.substr(splitIndex);
    value = value.substr(0, splitIndex);
  }
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
      moduleName = appConf.common;
    } else {
      // 若在公共模块也没有找到，则认为资源是不存在的资源，将模块设置成当前模块
      moduleName = config.module;
      gutil.log(gutil.colors.red('文件 ' + filename +' 中引用资源 ' + value + ' 没有找到！'));
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

module.exports = replace;
