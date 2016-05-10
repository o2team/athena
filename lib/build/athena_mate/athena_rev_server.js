/**
* @fileoverview server模式专用，资源做md5
* @author  liweitao
*/

'use strict';

var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');
var through2 = require('through2');
var _ = require('lodash');
var Util = require('../../util');

function rev (opts) {
  var config = _.assign({
    modulePath: null,
    revName: '',
    map: 'map.json'
  }, opts);
  var staticMap = {
    js: {},
    css: {},
    img: {}
  };
  var mapJson = JSON.parse(fs.readFileSync(path.join(config.modulePath, 'dist', config.map)).toString());
  if (mapJson[config.revName]) {
    staticMap = _.assign(staticMap, mapJson[config.revName]);
  }
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull() || file.isStream()) {
      return callback(null, file);
    }

    if (file.isBuffer()) {
      var md5Hash = Util.checksum(file.contents);
      var fpath = file.path;
      var ext = path.extname(fpath);
      var filename = fpath.replace(path.join(config.modulePath, 'dist', '_static', '/'), '').replace(ext, '');
      if (filename.indexOf('\\') >= 0) {
        filename = filename.replace(/\\/g, '\/');
      }
      var newFile = new gutil.File();
      var newFilename = filename + '_' + md5Hash + ext;
      newFile.path = path.join(path.dirname(fpath), path.basename(newFilename));
      newFile.contents = file.contents;
      newFile.cwd = file.cwd;
      newFile.base = file.base;

      if (Util.regexps.media.test(ext)) {
        staticMap.img[filename + ext] = newFilename;
        this.push(file);
        this.push(newFile);
      } else {
        if (/\.min/.test(filename)) {
          newFilename = path.basename(fpath, ext).replace(/\.min/g, '') + '_' + md5Hash + ext;
          newFile.path = path.join(config.modulePath, 'dist', '_static', path.basename(newFilename));
          this.push(newFile);
        } else {
          newFilename = filename.replace(ext, '') + '.min' + ext;
          this.push(file);
        }
        if (Util.regexps.js.test(ext)) {
          staticMap.js[filename + ext] = newFilename;
        } else if (Util.regexps.css.test(ext)) {
          staticMap.css[filename + ext] = newFilename;
        }
      }

      callback();
    }
  }, function (callback) {
    try {
      for (var i in staticMap) {
        if (i === 'js' || i === 'css') {
          for (var k in staticMap[i]) {
            var item = staticMap[i][k];
            if (item in staticMap[i]) {
              staticMap[i][k] = staticMap[i][item];
              delete staticMap[i][item];
            }
          }
        }
      }

      mapJson[config.revName] = staticMap;
      fs.writeFileSync(path.join(config.modulePath, 'dist', config.map), JSON.stringify(mapJson, null, 2));
    } catch (e) {
      console.log(e);
    }
    callback();
  });

  return stream;
}

module.exports = rev;
