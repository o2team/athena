'use strict'

var mkdirp = require('mkdirp');
var memFs = require('mem-fs');
var FileEditor = require('mem-fs-editor');
var path = require('path');
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');
var _ = require('lodash');

function _normalizeFamily(family) {
  return family ? family.toLowerCase() : 'ipv4';
}

var Util = {
  regexps: {
    // 空格
    blank: /(^\s+)|(\s+$)/g,
    // 注释
    comment: /(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm,
    // 图片
    images: /\.(jpeg|jpg|gif|png|webp)$/,
    // url
    url: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i,
    // media
    media: /\.(jpeg|jpg|gif|png|webp|mp3|mp4|oog|eot|svg|ttf|woff)/
  },
  homedir: function () {
    function homedir () {
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
  }(),

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
      var res = interfaces[name].filter(function(details) {
        var itemFamily = details.family.toLowerCase();
        return itemFamily === family;
      });
      if (res.length === 0)
        return undefined;
      return res[0].address;
    }

    var all = Object.keys(interfaces).map(function (nic) {
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
    return !ip.isPrivate(addr);
  },

  makeString: function (object) {
    if (object == null) {
      return '';
    }
    return '' + object;
  },

  classify: function (str) {
    str = Util.makeString(str);
    return _.capitalize(_.camelCase(str.replace(/[\W_]/g, ' ')).replace(/\s/g, ''));
  },

  decapitalize: function (str) {
    str = Util.makeString(str);
    return str.charAt(0).toLowerCase() + str.slice(1);
  },

  checksum: function (buf) {
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('Expected a buffer');
    }
    return crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
  },

  getHashName: function (id, mapJson) {
    var ext = path.extname(id);
    var dirname = path.dirname(id);
    var name = path.basename(id);
    var rev = mapJson.rev;
    var revByType = null;
    var nameHash = undefined;
    if (!rev) {
      return id;
    }

    if (/\js/.test(ext)) {
      revByType = rev.js;
    } else if (/css/.test(ext)) {
      revByType = rev.css;
    } else if (Util.regexps.media.test(ext)) {
      revByType = rev.img
    }
    if (name.indexOf('#') >= 0) {
      name = name.split('#');
      nameHash = name[1];
      name = name[0];
    }
    if (!revByType || !revByType[name]) {
      return id;
    }
    return dirname + '/' + revByType[name] + (nameHash ? nameHash : '');
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

  getConfig: function () {
    var config = fs.readFileSync(path.join(path.resolve(__dirname, '../../'), '.config.json'));
    config = JSON.parse(String(config));
    return config;
  },

  processHtml: function (contents, cb) {
    var reg = /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/script\s*>|$)|(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/style\s*>|$)|<(img|embed|audio|link|video|object|source)\s+[\s\S]*?["'\s\w\/\-](?:>|$)|__uri\(\s*([\s\S]*?)\)|<!--uri\[([\s\S]*?)\]-->/ig;
    contents = contents.replace(reg, function (m, $1, $2, $3, $4, $5, $6, $7, $8) {
      if ($1) { //<script>
        var embed = '';
        $1 = $1.replace(/(\s(?:data-)?src\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function(m, prefix, value) {
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
          m = m.replace(/(\s(?:data-)?href\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function(_, prefix, value) {
            if (typeof cb === 'function' && !isPrefetch) {
              value = cb(value);
            }
            return prefix + value;
          });
        } else if (tag === 'object') {
          m = m.replace(/(\sdata\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function(m, prefix, value) {
            if (typeof cb === 'function') {
              value = cb(value);
            }
            return prefix + value;
          });
        } else {
          m = m.replace(/(\s(?:data-)?src(?:set)?\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function(m, prefix, value) {
            if (prefix.indexOf('srcset') != -1) {
              // surpport srcset
              var info = Util.stringQuote(value);
              var srcset = [];
              info.rest.split(',').forEach(function(item) {
                var p;
                item = item.trim();
                if ((p = item.indexOf(' ')) == -1) {
                  srcset.push(item);
                  return;
                }
                var val = item.substr(0, p);
                if (typeof cb === 'function') {
                  val = cb(val);
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
      }
      return m;
    });
    return contents;
  },
  processJs: function (contents, cb) {
    var reg = /(__inline|__uri)\(([\s\S]*?)\)/g;
    contents = contents.replace(reg, function (m, type, value) {
      if (type) {
        switch (type) {
          case '__inline':
            if (typeof cb === 'function') {
              m = cb(value);
            }
            break;
          case '__uri':
            if (typeof cb === 'function') {
              m = cb(value);
            }
            break;
        }
      }
      return m;
    });
    return contents;
  },

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
  }

};

module.exports = Util;
