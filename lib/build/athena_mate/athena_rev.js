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
      var filenameRelative = path.relative(config.modulePath, fpath);
      var newFilenameRelative = path.join(path.dirname(filenameRelative), newFilename);
      newFile.path = path.join(path.dirname(fpath), newFilename);
      newFile.contents = file.contents;
      newFile.cwd = file.cwd;
      newFile.base = file.base;

      if (/\js/.test(ext)) {
        staticMap.js[filename + ext] = newFilename;
      } else if (/css/.test(ext)) {
        staticMap.css[filename + ext] = newFilename;
      } else if (Util.regexps.media.test(ext)) {
        staticMap.img[filename + ext] = newFilename;
      }
      this.push(newFile);
      this.push(file);
      callback();
    } else if (file.isStream()){

      return callback(null, file);
    }
  }, function (callback) {
    try {
      var mapJson = JSON.parse(fs.readFileSync(path.join(config.modulePath, 'dist', config.map)).toString());
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
