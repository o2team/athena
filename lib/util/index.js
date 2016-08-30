/**
 * @fileoverview 辅助性方法
 * @author  liweitao
 */

'use strict';

var path = require('path');
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');
var url = require('url');
var _ = require('lodash');
var chalk = require('chalk');
var util = require('util');
var rmfolder = require('./rmfolder');
var mapScssImports = require('./map_scss_imports');

function _normalizeFamily(family) {
  return family ? family.toLowerCase() : 'ipv4';
}

var Util = {
  // 一些正则
  regexps: {
    // 空格
    blank: /(^\s+)|(\s+$)/g,
    // 注释
    comment: /(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm,
    // 图片
    images: /\.(jpeg|jpg|gif|png|webp)(\?[\s\S]*)?/,
    // url
    url: /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i,
    // media
    media: /\.(jpeg|jpg|gif|png|webp|ico|mp3|mp4|oog|wav|eot|svg|ttf|woff)/,
    tpl: /\.(html|php|vm)/,
    js: /\.(js)/,
    css: /\.(css)/,
    singleBraceInterpolate: /{([\s\S]+?)}/g,
    doubleBraceInterpolate: /{{([\s\S]+?)}}/g,
    htmlTag: /(<([^>]+)>)/ig
  },

  /**
   * 获取athena目录
   */
  getAthenaPath: function () {
    var athenaPath = path.join(this.homedir(), '.athena');
    if (!this.existsSync(athenaPath)) {
      fs.mkdirSync(athenaPath);
    }
    return athenaPath;
  },

  /**
   * 获取用户目录
   */
  homedir: function () {
    function homedir() {
      var env = process.env;
      var home = env.HOME;
      var user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

      if (process.platform === 'win32') {
        return env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH || home || null;
      }

      if (process.platform === 'darwin') {
        return home || (user ? '/Users/' + user : null);
      }

      if (process.platform === 'linux') {
        return home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : null));
      }

      return home || null;
    }
    return typeof os.homedir === 'function' ? os.homedir : homedir;
  } (),

  /**
   * 获取用户ip
   */
  getLocalIp: function (name, family) {
    var interfaces = os.networkInterfaces();
    var all;

    //
    // Default to `ipv4`
    //
    family = _normalizeFamily(family);

    //
    // If a specific network interface has been named,
    // return the address.
    //
    if (name && name !== 'private' && name !== 'public') {
      var res = interfaces[name].filter(function (details) {
        var itemFamily = details.family.toLowerCase();
        return itemFamily === family;
      });
      if (res.length === 0)
        return undefined;
      return res[0].address;
    }

    all = Object.keys(interfaces).map(function (nic) {
      //
      // Note: name will only be `public` or `private`
      // when this is called.
      //
      var addresses = interfaces[nic].filter(function (details) {
        details.family = details.family.toLowerCase();
        if (details.family !== family || Util.isLoopback(details.address)) {
          return false;
        } else if (!name) {
          return true;
        }

        return name === 'public' ? !Util.isPrivate(details.address) :
          Util.isPrivate(details.address);
      });

      return addresses.length ? addresses[0].address : undefined;
    }).filter(Boolean);

    return !all.length ? Util.loopback(family) : all[0];
  },

  loopback: function loopback(family) {
    //
    // Default to `ipv4`
    //
    family = _normalizeFamily(family);

    if (family !== 'ipv4' && family !== 'ipv6') {
      throw new Error('family must be ipv4 or ipv6');
    }

    return family === 'ipv4' ? '127.0.0.1' : 'fe80::1';
  },

  isLoopback: function isLoopback(addr) {
    return /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/
      .test(addr) ||
      /^fe80::1$/.test(addr) ||
      /^::1$/.test(addr) ||
      /^::$/.test(addr);
  },

  isPrivate: function isPrivate(addr) {
    return /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/
      .test(addr) ||
      /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/.test(addr) ||
      /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/
        .test(addr) ||
      /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/.test(addr) ||
      /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/.test(addr) ||
      /^fc00:/i.test(addr) ||
      /^fe80:/i.test(addr) ||
      /^::1$/.test(addr) ||
      /^::$/.test(addr);
  },

  isPublic: function isPublic(addr) {
    return !Util.isPrivate(addr);
  },

  /**
   * 变成字符串
   */
  makeString: function (object) {
    if (object == null) {
      return '';
    }
    return '' + object;
  },

  /**
   * 首字母大写
   */
  classify: function (str) {
    str = Util.makeString(str);
    return _.capitalize(_.camelCase(str.replace(/[\W_]/g, ' ')).replace(/\s/g, ''));
  },

  decapitalize: function (str) {
    str = Util.makeString(str);
    return str.charAt(0).toLowerCase() + str.slice(1);
  },

  /**
   * 拼写URL
   */
  urlJoin: function () {
    function normalize(str) {
      return str
        .replace(/([\/]+)/g, '/')
        .replace(/\/\?(?!\?)/g, '?')
        .replace(/\/\#/g, '#')
        .replace(/\:\//g, '://');
    }

    var joined = [].slice.call(arguments, 0).join('/');
    return normalize(joined);
  },

  /**
   * 解析sass @import
   */
  sassImports: function (content) {
    var re = /\@import (["'])(.+?)\1;/g,
      match = {},
      results = [];
    content = new String(content).replace(/\/\*.+?\*\/|\/\/.*(?=[\n\r])/g, '');
    while (match = re.exec(content)) {
      results.push(match[2]);
    }
    return results;
  },

  readJsonFile: function (fPath) {
    var json = {};
    if (Util.existsSync(fPath)) {
      try {
        json = JSON.parse(fs.readFileSync(fPath));
      } catch (ex) {
        console.log(chalk.red('读取文件' + fPath + '失败...！文件可能不存在，或有语法错误，请检查！'));
        json = {};
      }
    }
    return json;
  },

  getUrlParseSplit: function (value) {
    var valueParse = url.parse(value);
    var splitAfter = '';
    var newValue = '';
    if (valueParse.host) {
      newValue = ['//', valueParse.host, valueParse.pathname].join('');
    } else {
      newValue = valueParse.pathname;
    }
    splitAfter = value.replace(newValue, '');
    splitAfter = splitAfter ? splitAfter : '';
    return {
      pathname: newValue,
      split: splitAfter
    };
  },

  /**
   * 根据内容生成md5
   */
  checksum: function (buf, length) {
    if (!Buffer.isBuffer(buf)) {
      buf = new Buffer(buf);
    }
    return crypto.createHash('md5').update(buf).digest('hex').slice(0, length || 8);
  },

  /** 
   * 判断是否是今天 
   */
  isToday: function (time) {
    return new Date().getTime() - new Date(time).getTime() < 86400000;
  },

  /**
   * 获取文件名对应的md5，client模式
   */
  getHashName: function (id, mapJson) {
    var ext = path.extname(id);
    id = id.split(path.sep);
    id = id.join('/');
    var imagesIndex = id.indexOf('images/');
    var jsIndex = id.indexOf('js/');
    var cssIndex = id.indexOf('css/');
    var index = Math.max(imagesIndex, jsIndex, cssIndex);
    if (index < 0) {
      return id;
    }
    var idPrefix = id.substr(0, index);
    id = id.substr(index);
    var rev = mapJson.rev;
    var revByType = null;
    if (!rev) {
      return id;
    }
    if (Util.regexps.js.test(ext)) {
      revByType = rev.js;
    } else if (Util.regexps.css.test(ext)) {
      revByType = rev.css;
    } else if (Util.regexps.media.test(ext)) {
      revByType = rev.img;
    }
    var splitAfter = '';
    var idParse = this.getUrlParseSplit(id);
    id = idParse.pathname;
    splitAfter = idParse.split;
    if (!revByType || !revByType[id]) {
      return id;
    }

    return idPrefix + revByType[id] + splitAfter;
  },

  /**
   * 获取文件名对应的md5，server模式
   */
  getHashNameServer: function (id, mapJson) {
    var ext = path.extname(id);
    var rev = mapJson.rev;
    var revByType = null;
    if (!rev) {
      return id;
    }
    if (Util.regexps.js.test(ext)) {
      revByType = rev.js;
    } else if (Util.regexps.css.test(ext)) {
      revByType = rev.css;
    } else if (Util.regexps.media.test(ext)) {
      revByType = rev.img;
    }
    var splitAfter = '';
    var idParse = this.getUrlParseSplit(id);
    id = idParse.pathname;
    splitAfter = idParse.split;
    if (!revByType || !revByType[id]) {
      return id;
    }
    return revByType[id] + splitAfter;
  },

  /**
   * 获取静态资源路径信息
   */
  getStaticPath: function (fpath) {
    var dirname = path.dirname(fpath);
    var dirnameArr = [];
    var splitFlag = '';
    if (dirname.indexOf('\/') >= 0) {
      splitFlag = '\/';
    } else {
      splitFlag = '\\';
    }
    dirnameArr = dirname.split(splitFlag);
    var imagesIndex = dirnameArr.indexOf('images');
    var cssIndex = dirnameArr.indexOf('css');
    var jsIndex = dirnameArr.indexOf('js');
    var index = Math.max(imagesIndex, jsIndex, cssIndex);
    if (index >= 0) {
      fpath = fpath.split(splitFlag).splice(index).join(splitFlag);
    }
    return {
      index: index,
      path: fpath
    };
  },

  /**
   * 获取静态资源路径信息server模式
   */
  getStaticPathServer: function (fpath, excludePath) {
    var innerPath = fpath.replace(excludePath, '');
    var dirname = path.dirname(innerPath);
    var dirnameArr = [];
    var splitFlag = '';
    if (dirname.indexOf('\/') >= 0) {
      splitFlag = '\/';
    } else {
      splitFlag = '\\';
    }
    dirnameArr = dirname.split(splitFlag);
    var staticIndex = dirnameArr.indexOf('s');
    if (staticIndex >= 0) {
      fpath = innerPath.split(splitFlag).splice(staticIndex + 1).join(splitFlag);
    }
    return {
      index: staticIndex,
      path: fpath
    };
  },

  stringQuote: function (str, quotes) {
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
  },

  /**
   * 通过文件路径，获取模块信息
   */
  getModuleInfoViaPath: function (fPath, appPath) {
    var modulePathRelative = fPath.replace(appPath, '');
    if (modulePathRelative === fPath) {
      return null;
    }
    var folderNames = path.dirname(modulePathRelative).split(path.sep);
    var moduleFolder = folderNames[0].length ? folderNames[0] : folderNames[1];
    return moduleFolder;
  },

  originPathConvertToDistPath: function (originPath, modulePath) {
    var modulePathAfter = originPath.replace(modulePath, '');
    return path.join(modulePath, 'dist', '_', modulePathAfter);
  },

  /**
   * 获取athena根目录
   */
  getRootPath: function () {
    return path.resolve(__dirname, '../../');
  },

  /**
   * 获取athena package.json
   */
  getPkgInfo: function () {
    var info = {};
    try {
      info = JSON.parse(String(fs.readFileSync(path.join(this.getRootPath(), 'package.json'))));
    } catch (e) {
      console.log('  读取package.json出错！');
    }
    return info;
  },

  /**
   * 获取athena配置
   */
  getConfig: function () {
    var configPath = path.join(this.getAthenaPath(), 'config.json');
    var config = {};
    if (this.existsSync(configPath)) {
      try {
        config = JSON.parse(String(fs.readFileSync(configPath)));
      } catch (e) {
        config = {};
      }
    }
    return config;
  },

  /**
   * 写入athena配置
   */
  setConfig: function (config) {
    var athenaPath = this.getAthenaPath();
    if (typeof config === 'object') {
      fs.writeFileSync(path.join(athenaPath, 'config.json'), JSON.stringify(config, null, 2));
    }
  },

  /**
   * 获取athena设置
   */
  getSetting: function () {
    var settingPath = path.join(this.getRootPath(), '.setting.json');
    var setting = {};
    if (fs.existsSync(settingPath)) {
      try {
        setting = JSON.parse(String(fs.readFileSync(settingPath)));
      } catch (e) {
        setting = {};
      }
    }
    return setting;
  },

  /**
   * 写入athena配置
   */
  setSetting: function (setting) {
    if (typeof setting === 'object') {
      fs.writeFileSync(path.join(this.getRootPath(), '.setting.json'), JSON.stringify(setting, null, 2));
    }
  },

  /**
   * 生成统计信息
   */
  generateStatistics: function (modulePath, namespace, data) {
    var dest = path.join(modulePath, 'dist');
    var statisticsPath = path.join(dest, 'statistics.json');
    var statisticsJson = {};
    var temp = {};
    namespace = namespace.split('.');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    if (fs.existsSync(statisticsPath)) {
      try {
        statisticsJson = fs.readFileSync(path.join(dest, 'statistics.json'));
        statisticsJson = JSON.parse(statisticsJson.toString());
      } catch (e) {
        statisticsJson = {};
      }
    }

    temp = (function generate(json, i) {
      if (i === -1) {
        return json;
      }
      var key = {};
      if (i === namespace.length - 1) {
        key[namespace[i]] = data;
      } else {
        key[namespace[i]] = json;
      }

      return generate(key, --i);
    })(temp, namespace.length - 1);
    _.merge(statisticsJson, temp);

    fs.writeFileSync(path.join(dest, 'statistics.json'), JSON.stringify(statisticsJson, null, 2));
  },

  prettyBytes: function (num) {
    if (typeof num !== 'number' || Number.isNaN(num)) {
      throw new TypeError('Expected a number');
    }

    var exponent;
    var unit;
    var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    if (Math.abs(num) < 1) {
      return num + ' B';
    }

    exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1);
    num = (num / Math.pow(1000, exponent)).toFixed(2) * 1;
    unit = units[exponent];

    return num + ' ' + unit;
  },

  // 降版本号分割成可比较的数组
  splitVersion: function (version) {
    version = version.replace(/(\d+)([^\d\.]+)/, '$1.$2');
    version = version.replace(/([^\d\.]+)(\d+)/, '$1.$2');
    var parts = version.split('.');
    var rmap = {
      'rc': -1,
      'pre': -2,
      'beta': -3,
      'b': -3,
      'alpha': -4,
      'a': -4
    };
    var v, n;
    var splits = [];
    for (var i = 0; i < parts.length; ++i) {
      v = parts[i];
      n = parseInt(v, 10);
      if (isNaN(n)) {
        n = rmap[v] || -1;
      }
      splits.push(n);
    }
    return splits;
  },

  // 比较版本号数组，结果0表示两个版本一致，-1表示version2更旧，1表示version2更新
  compareVersion: function (version1, version2) {
    version1 = this.splitVersion(version1);
    version2 = this.splitVersion(version2);
    var v1, v2;
    for (var i = 0; i < Math.max(version1.length, version2.length); ++i) {
      v1 = version1[i] || 0;
      v2 = version2[i] || 0;
      if (v2 > v1) {
        return 1;
      }
      if (v1 > v2) {
        return -1;
      }
    }
    return 0;
  },

  // 由于fs.existsSync 将会被废弃，需要另谋出路
  existsSync: function (fPath) {
    try {
      var stats = fs.statSync(fPath);
      return (stats.isFile() || stats.isDirectory());
    } catch (err) {
      return false;
    }
  },

  // 以下三个处理方式参考自 fis
  // Copyright (c) 2015, Baidu FEX team
  // https://github.com/fex-team/fis3/blob/master/lib/compile.js#L395
  processHtml: function (contents, cb) {
    var reg = /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/script\s*>|$)|(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/style\s*>|$)|<(img|embed|audio|link|video|object|source)\s+[\s\S]*?["'\s\w\/\-](?:>|$)|__uri\(\s*([\s\S]*?)\)|<!--uri\[([^\]]+)\]-->|__inline\(\s*([\s\S]*?)\)|<!--inline\[([^\]]+)\]-->|\bstyle\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])+"|'(?:[^\\'\n\r\f]|\\[\s\S])+')/ig;
    contents = contents.replace(reg, function (m, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) {
      if ($1) { //<script>
        var embed = '';
        $1 = $1.replace(/(\s(?:data-)?src\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
          if (typeof cb === 'function') {
            value = cb(value);
          }
          return prefix + value;
        });
        if ($2.length > 0) {
          $2 = Util.processJs($2, cb);
        }
        m = $1 + $2;
      } else if ($3) { //<style>
        m = Util.processCss(m, cb);
      } else if ($5) { //<img|embed|audio|link|video|object|source>
        var tag = $5.toLowerCase();
        if (tag === 'link') {
          var isPrefetch = false;
          var result = m.match(/\srel\s*=\s*('[^']+'|"[^"]+"|[^\s\/>]+)/i);
          if (result && result[1]) {
            var rel = result[1].replace(/^['"]|['"]$/g, '').toLowerCase();
            if (rel.indexOf('prefetch') >= 0) {
              isPrefetch = true;
            }
          }
          m = m.replace(/(\s(?:data-)?href\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (_, prefix, value) {
            if (typeof cb === 'function' && !isPrefetch) {
              value = cb(value);
            }
            return prefix + value;
          });
          m = m.replace(/(\s?combo-use\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (_, prefix, value) {
            if (typeof cb === 'function' && !isPrefetch) {
              value = cb(value);
            }
            return prefix + value;
          });
        } else if (tag === 'object') {
          m = m.replace(/(\sdata\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
            if (typeof cb === 'function') {
              value = cb(value);
            }
            return prefix + value;
          });
        } else {
          m = m.replace(/(\s(?:data-)?src(?:set)?\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
            if (prefix.indexOf('srcset') != -1) {
              // surpport srcset
              var info = Util.stringQuote(value);
              var srcset = [];
              info.rest.split(',').forEach(function (item) {
                var p;
                item = item.trim();
                if ((p = item.indexOf(' ')) === -1) {
                  srcset.push(item);
                  return;
                }
                var val = item.substr(0, p);
                if (typeof cb === 'function') {
                  val = cb(val) + item.substr(p);
                }
                srcset.push(val);
              });
              return prefix + info.quote + srcset.join(', ') + info.quote;
            }
            if (typeof cb === 'function') {
              value = cb(value);
            }
            return prefix + value;
          });
        }
      } else if ($6) {
        if (typeof cb === 'function') {
          m = cb($6);
        }
      } else if ($7) {
        if (typeof cb === 'function') {
          m = cb($7);
        }
      } else if ($8) {
        if (typeof cb === 'function') {
          m = cb($8, 'content');
        }
      } else if ($9) {
        if (typeof cb === 'function') {
          m = cb($9, 'content');
        }
      } else if ($10) { //style=""
        var quote = $10[0];
        m = 'style=' + quote + Util.processCss($10.substring(1, $10.length - 1), cb) + quote;
      }
      return m;
    });
    return contents;
  },

  // https://github.com/fex-team/fis3/blob/master/lib/compile.js#L294
  processJs: function (contents, cb) {
    var reg = /(__inline|__uri)\(([\s\S]*?)\)/g;
    contents = contents.replace(reg, function (m, type, value) {
      if (type) {
        switch (type) {
          case '__inline':
            if (typeof cb === 'function') {
              m = cb(value, 'content');
            }
            break;
          case '__uri':
            if (typeof cb === 'function') {
              m = cb(value, 'url');
            }
            break;
        }
      }
      return m;
    });
    return contents;
  },

  // https://github.com/fex-team/fis3/blob/master/lib/compile.js#L347
  processCss: function (contents, cb) {
    var reg = /(\/\*[\s\S]*?(?:\*\/|$))|(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}\s]+)\s*\)(\s*;?)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;
    contents = contents.replace(reg, function (m, comment, url, last, filter) {
      if (url) {
        if (m.indexOf('@') === 0) {
          m = m;
        } else {
          if (typeof cb === 'function') {
            url = cb(url);
          }
          m = 'url(' + url + ')' + last;
        }
      } else if (filter) {
        if (typeof cb === 'function') {
          filter = cb(filter);
        }
        m = 'src=' + filter;
      }
      return m;
    });
    return contents;
  },

  rmfolder: rmfolder,
  mapScssImports: mapScssImports,

  /**
   * Try to transform a file to the format like 'data:image/png;base64,fasdfk=='.
   * Return original filename when failed. 
   * @param {String} filename - filename to the file.
   * @return String
   */
  transform2DataURI: function (filename) {
    var uri;
    try {
      uri = 'data:image/' + path.extname(filename).substr(1) + ';base64,' + fs.readFileSync(filename).toString('base64');
    } catch (e) {
      uri = filename;
    }
    return uri;
  },

  /**
   * Inspect anything.
   */
  inspect: function () {
    var _args = [].slice.call(arguments);
    console.log(_args.map(function (v, k) {
      var __str,
        __owner = v,
        __inspect = __owner && __owner.inspect;
      if (__inspect) {
        while (1) {
          if (__owner == null || __owner.hasOwnProperty('inspect'))
            break;
          __owner = __owner.__proto__;
        }
        __owner.inspect = null;
      }
      __str = util.inspect(v, {
        showHidden: true,
        colors: true,
        depth: null
      });
      if (__inspect)
        __owner.inspect = __inspect;
      return __str;
    }).join(' '));
  },

  /**
   * get query as a hash Object.
   * @param {String} pathname - url string to be transform from.
   * @returns {Object} the hash Object.
   */
  getQueryObj: function (pathname) {
    var query = url.parse(pathname).query,
      obj = {};
    if (query === null)
      return obj;
    query.split('&').forEach(function (v, k) {
      var tmp = v.split('='),
        key = tmp[0],
        val = 1 in tmp ? tmp[1] : true;
      obj[key] = val;
    });
    return obj;
  }

};

module.exports = Util;