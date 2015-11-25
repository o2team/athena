'use strict';

var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');
var through = require('through-gulp');
var _ = require('lodash');
var Util = require('../../util');

var config = {};
var staticMap = null;

function rev (opts) {
  config = _.assign({
    modulePath: null,
    revName: '',
    map: 'map.json'
  }, opts);
  staticMap = {
    js: {},
    css: {},
    img: {}
  };
  var mapJson = JSON.parse(fs.readFileSync(path.join(config.modulePath, 'dist', config.map)).toString());
  if (mapJson[config.revName]) {
    staticMap = mapJson[config.revName];
    if (!staticMap.js) {
      staticMap.js = {};
    }
    if (!staticMap.css) {
      staticMap.css = {};
    }
    if (!staticMap.img) {
      staticMap.img = {};
    }
  }
  var stream = through(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isBuffer()) {
      var md5Hash = Util.checksum(file.contents);
      var fpath = file.path;
      var ext = path.extname(fpath);
      var filename = path.basename(fpath, ext);
      var newFile = new gutil.File();
      var newFilename = filename + '_' + md5Hash + ext;
      newFile.path = path.join(path.dirname(fpath), newFilename);
      newFile.contents = file.contents;
      newFile.cwd = file.cwd;
      newFile.base = file.base;

      if (Util.regexps.media.test(ext)) {
        staticMap.img[filename + ext] = newFilename;
        this.push(file);
        this.push(newFile);
      } else {
        if (/\.min/.test(filename)) {
          this.push(newFile);
        } else {
          newFilename = path.basename(filename, ext) + '.min' + ext;
          this.push(file);
        }
        if (/\.js/.test(ext)) {
          staticMap.js[filename + ext] = newFilename;
        } else if (/\.css/.test(ext)) {
          staticMap.css[filename + ext] = newFilename;
        }
      }

      callback();
    } else if (file.isStream()){

      return callback(null, file);
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
