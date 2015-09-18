'use strict'

var mkdirp = require('mkdirp');
var memFs = require('mem-fs');
var FileEditor = require('mem-fs-editor');
var path = require('path');
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');
var _ = require('lodash');

var Util = {
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

  processHtml: function (contents, cb) {
    var reg = /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/script\s*>|$)|(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/style\s*>|$)|<(img|embed|audio|link|video|object|source)\s+[\s\S]*?["'\s\w\/\-](?:>|$)|<!--inline\[([^\]]+)\]-->|<!--(?!\[)([\s\S]*?)(-->|$)/ig;
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
      }
      return m;
    });
    return contents;
  },
  processJs: function (contents, cb) {
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
