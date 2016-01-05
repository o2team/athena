'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var gutil = require('gulp-util');
var through = require('through-gulp');

var Util = require('../../util');

var config = {};
var mapJSONCache = {};
var includeJson = {};

function replace (opts) {
  config = _.assign({
    cwd: undefined,
    module: undefined,
    replaceType: 'local',
    pack: false
  }, opts);

  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at replace!'));
    return;
  }

  config.replaceType = config.replaceType ? config.replaceType : 'local';

  var modulePath = path.join(config.cwd, config.module);
  // 读取module-conf配置文件
  config.moduleConf = require(path.join(modulePath, 'module-conf'));
  config.appConf = require(path.join(config.cwd, 'app-conf'));
  var resourcePrefix = null;
  var mapJson = JSON.parse(fs.readFileSync(path.join(modulePath, 'dist', 'map.json')).toString());
  mapJSONCache[config.module] = mapJson;
  if (config.appConf && config.moduleConf) {
    var deployObj = config.appConf.deploy;
    resourcePrefix = {};
    for (var key in deployObj) {
      if (key === 'local') {
        resourcePrefix.local = deployObj.local ? (deployObj.local.fdPath ? deployObj.local.fdPath : '/') : '/';
      } else {
        if (deployObj[key].fdPath.lastIndexOf('/') == 0) {
          deployObj[key].fdPath = deployObj[key].fdPath + '/';
        }
        resourcePrefix[key] = '//' + deployObj[key].domain + deployObj[key].fdPath + config.appConf.app + '/';
      }
    }
  }

  var stream = through(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var extname = path.extname(file.path);
      var basename = path.basename(file.path);
      includeJson[basename] = [];
      if (extname.match(/js/)) {
        file.contents = new Buffer(processJs(basename, file.contents.toString(), resourcePrefix[config.replaceType]));
      } else if (extname.match(/(css|sass|less)/)) {
        file.contents = new Buffer(processCss(basename, file.contents.toString(), resourcePrefix[config.replaceType]));
      } else if (extname.match(/html/)) {
        file.contents = new Buffer(processHtml(basename, file.contents.toString(), resourcePrefix[config.replaceType]));
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

function processHtml (filename, contents, resourcePrefix) {
  contents = Util.processHtml(contents, function (value) {
    value = transmitResource(filename, value, resourcePrefix, true);
    return value;
  });
  return contents;
}

function processJs (filename, contents, resourcePrefix) {
  contents = Util.processJs(contents, function (value) {
    value = transmitResource(filename, value, resourcePrefix, true);
    return value;
  });
  return contents;
}

function processCss (filename, contents, resourcePrefix) {
  contents = Util.processCss(contents, function (value) {
    value = transmitResource(filename, value, resourcePrefix, true);
    return value;
  });
  return contents;
}

function transmitResource (filename, value, resourcePrefix, needMd5) {
  var vStart = '';
  var vEnd = '';
  var mapJson = mapJSONCache[config.module];
  if (value.indexOf('\"') >= 0 || value.indexOf('\'') >= 0) {
    vStart = value[0];
    vEnd = value[value.length - 1];
    value = value.replace(/\"/g, '').replace(/\'/g, '');
  }
  var dirname = path.dirname(value);
  var dirnameArr = dirname.split(path.sep);
  var imagesIndex = dirnameArr.indexOf('images');
  var cssIndex = dirnameArr.indexOf('css');
  var jsIndex = dirnameArr.indexOf('js');
  if (!Util.regexps.url.test(value) && value.length > 0
      && value.indexOf('data:image') < 0
      && (imagesIndex >= 0 || cssIndex >= 0 || jsIndex >= 0)) {
    var index = Math.max(imagesIndex, cssIndex, jsIndex);
    var valueInfo = trackResource(filename, value, index);
    value = valueInfo.value.replace(/\\/ig,'/');
    var moduleName = valueInfo.module; //这里还是要改成'/' 不能用path.sep 因为css的中的href链接都是'/'
    if (moduleName !== config.module) {
      if (config.pack) {
        value = '../' + moduleName + '/' + value;
      }
      mapJson = mapJSONCache[moduleName] = JSON.parse(fs.readFileSync(path.join(config.cwd, moduleName, 'dist', 'map.json')).toString());
    } else {
      if (imagesIndex >= 0 && config.pack && ! /\.(js|html)/.test(filename)) {
        value = '../' + value;
      }
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
    if (mapJson && needMd5 && !config.pack) {
      value = Util.getHashName(value, mapJson);
    }

    if (!config.pack) {
      value = resourcePrefix + moduleName + '/' + value;
    }
  }
  value = vStart + value + vEnd;
  return value;
}

function trackResource (filename, value, index) {
  value = value.split('/').splice(index).join('/');
  var distPath = path.join(config.cwd, config.module, 'dist', 'output');
  var gDistPath = path.join(config.cwd, config.appConf.common, 'dist', 'output');
  // 带有查询字符串或hash
  var queryIndex = value.indexOf('?');
  var hashIndex = value.indexOf('#');
  var splitIndex = Math.max(queryIndex, hashIndex);
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
      moduleName = config.appConf.common;
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
