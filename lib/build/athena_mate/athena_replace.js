'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var gutil = require('gulp-util');
var through = require('through-gulp');

var config = {};

function stringQuote (str, quotes) {
  var info = {
    origin: str,
    rest: str = str.trim(),
    quote: ''
  };
  if (str) {
    quotes = quotes || '\'"';
    var strLen = str.length - 1;
    for (var i = 0, len = quotes.length; i < len; i++) {
      var c = quotes[i];
      if (str[0] === c && str[strLen] === c) {
        info.quote = c;
        info.rest = str.substring(1, strLen);
        break;
      }
    }
  }
  return info;
}

function replace (opts) {
  config = _.assign({
    cwd: undefined,
    module: undefined,
    replaceType: 'deploy'
  }, opts);

  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at scan!'));
    return;
  }
  var modulePath = path.join(config.cwd, config.module);
  // 读取module-conf配置文件
  var moduleConf = require(path.join(modulePath, 'module-conf'));
  var appConf = require(path.join(config.cwd, 'app-conf'));
  var resourcePrefix = null;
  var mapJson = JSON.parse(fs.readFileSync(path.join(modulePath, 'dist', 'map.json')).toString());
  if (appConf && moduleConf) {
    var deployObj = appConf.deploy;
    resourcePrefix = {};
    resourcePrefix.qiang = '/' + deployObj.qiang.remotePath + '/' + moduleConf.module + '/';
    resourcePrefix.jdTest = '//' + deployObj.jdTest.domain + deployObj.jdTest.fdPath + '/' + appConf.app + '/' + moduleConf.module + '/';
    resourcePrefix.tencent = '//' + deployObj.tencent.domain + deployObj.tencent.fdPath + '/' + appConf.app + '/' + moduleConf.module + '/';
  }

  var stream = through(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var extname = path.extname(file.path);
      if (extname.match(/js/)) {
        file.contents = new Buffer(processJs(file.contents.toString(), resourcePrefix, mapJson));
      } else if (extname.match(/(css|sass|less)/)) {
        file.contents = new Buffer(processCss(file.contents.toString(), resourcePrefix, mapJson));
      } else if (extname.match(/html/)) {
        file.contents = new Buffer(processHtml(file.contents.toString(), resourcePrefix, mapJson));
      }
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

function processHtml (contents, resourcePrefix, mapJson) {
  var reg = /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/script\s*>|$)|(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/style\s*>|$)|<(img|embed|audio|video|object|source)\s+[\s\S]*?["'\s\w\/\-](?:>|$)|<!--inline\[([^\]]+)\]-->|<!--(?!\[)([\s\S]*?)(-->|$)/ig;
  contents = contents.replace(reg, function (m, $1, $2, $3, $4, $5, $6, $7, $8) {
    if (!resourcePrefix) {
      gutil.log(gutil.colors.red('模块' + config.module + '中module-conf.js缺少resourcePrefix配置！'))
      return m;
    }
    if ($3) { //<style>
      m = processCss(m, resourcePrefix);
    } else if ($5) { //<img|embed|audio|video|object|source>
      var tag = $5.toLowerCase();
      if (tag === 'object') {
        m = m.replace(/(\sdata\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function(m, prefix, value) {
          value = getHashName(value, mapJson);
          return prefix + resourcePrefix[config.replaceType] + value;
        });
      } else {
        m = m.replace(/(\s(?:data-)?src(?:set)?\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function(m, prefix, value) {
          if (prefix.indexOf('srcset') != -1) {
            // surpport srcset
            var info = stringQuote(value);
            var srcset = [];
            info.rest.split(',').forEach(function(item) {
              var p;
              item = item.trim();
              if ((p = item.indexOf(' ')) == -1) {
                srcset.push(item);
                return;
              }
              var val = item.substr(0, p);
              val = transmitResource(val, resourcePrefix[config.replaceType], mapJson)
              srcset.push(val);
            });
            return prefix + info.quote + srcset.join(', ') + info.quote;
          }
          value = transmitResource(value, resourcePrefix[config.replaceType], mapJson);
          return prefix + value;
        });
      }
    }
    return m;
  });
  return contents;
}

function processJs (contents, resourcePrefix, mapJson) {
  return contents;
}

function processCss (contents, resourcePrefix, mapJson) {
  var reg = /(\/\*[\s\S]*?(?:\*\/|$))|(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}\s]+)\s*\)(\s*;?)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;
  contents = contents.replace(reg, function (m, comment, url, last, filter) {
    if (!resourcePrefix) {
      gutil.log(gutil.colors.red('模块' + config.module + '中module-conf.js缺少resourcePrefix配置！'))
      return m;
    }
    if (url) {
      if (m.indexOf('@') === 0) {
        m = m;
      } else {
        url = transmitResource(url, resourcePrefix[config.replaceType], mapJson);
        m = 'url(' + url + ')' + last;
      }
    } else if (filter) {
      filter = transmitResource(filter, resourcePrefix[config.replaceType], mapJson);
      m = 'src=' + filter;
    }
    return m;
  });
  return contents;
}

function transmitResource (value, resourcePrefix, mapJson) {
  var vStart = '';
  var vEnd = '';
  if (value.indexOf('\"') >= 0 || value.indexOf('\'') >= 0) {
    vStart = value[0];
    vEnd = value[value.length - 1];
    value = value.replace(/\"/g, '').replace(/\'/g, '');
  }
  var valueArr = path.dirname(value).split(path.sep);
  var lastSecondDir = valueArr[valueArr.length - 1];
  value = lastSecondDir + '/' + path.basename(value);
  value = getHashName(value, mapJson);
  value = resourcePrefix + value;
  value = vStart + value + vEnd;
  return value;
}

function getHashName (id, mapJson) {
  var ext = path.extname(id);
  var dirname = path.dirname(id);
  var name = path.basename(id);
  var rev = mapJson.rev;
  var revByType = null;
  if (!rev) {
    return id;
  }
  if (/\js/.test(ext)) {
    revByType = rev.js;
  } else if (/css/.test(ext)) {
    revByType = rev.css;
  } else if (/png|jpg|jpeg|gif/.test(ext)) {
    revByType = rev.img
  }

  if (!revByType || !revByType[name]) {
    return id;
  }

  return path.join(dirname, revByType[name]);
}

module.exports = replace;
