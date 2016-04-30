/**
 * 从gulp-concat修改而来，主要是为了适应本项目
 * 原repo https://github.com/contra/gulp-concat
 * Copyright (c) 2014 Fractal contact@wearefractal.com
 */

'use strict';

var path = require('path');
var gutil = require('gulp-util');
var through2 = require('through2');
var Concat = require('concat-with-sourcemaps');
var File = gutil.File;
var PluginError = gutil.PluginError;
var Util = require('../../util');

function concatCore (file, opt) {
  if (!file) {
    throw new PluginError('concat_core', '必需传入文件');
  }
  opt = opt || {};

  if (typeof opt.newLine !== 'string') {
    opt.newLine = gutil.linefeed;
  }
  var isUsingSourceMaps = false;
  var latestFile;
  var latestMod;
  var fileName;
  var concat;
  var contentStr;

  if (typeof file === 'string') {
    fileName = file;
  } else if (typeof file.path === 'string') {
    fileName = path.basename(file.path);
  } else {
    throw new PluginError('concat_core', '未知文件');
  }

  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      callback();
      return;
    }
    if (file.isStream()) {
      this.emit('error', new PluginError('concat_core',  '不支持Streaming'));
      callback();
      return;
    }

    // 支持sourcemap
    if (file.sourceMap && isUsingSourceMaps === false) {
      isUsingSourceMaps = true;
    }

    if (!latestMod || file.stat && file.stat.mtime > latestMod) {
      latestFile = file;
      latestMod = file.stat && file.stat.mtime;
    }

    if (!concat) {
      concat = new Concat(isUsingSourceMaps, fileName, opt.newLine);
    }
    // 处理一下空的文件
    contentStr = file.contents.toString();
    contentStr = contentStr.replace(Util.regexps.blank, '');
    var contentArr = contentStr.split('\n');
    contentArr = contentArr.map(function (item) {
      if (item.indexOf('@charset') >= 0) {
        return '';
      }
      return item;
    });
    contentStr = contentArr.join('\n');
    file.contents = new Buffer(contentStr);
    if (contentStr.length) {
      concat.add(file.relative, file.contents, file.sourceMap);
    }
    callback();
  }, function (callback) {
    if (!latestFile || !concat) {
      callback();
      return;
    }
    var joinedFile;
    if (typeof file === 'string') {
      joinedFile = latestFile.clone({contents: false});
      joinedFile.path = path.join(latestFile.base, file);
    } else {
      joinedFile = new File(file);
    }
    joinedFile.contents = concat.content;
    if (concat.sourceMapping) {
      joinedFile.sourceMap = JSON.parse(concat.sourceMap);
    }
    var joinedFileContent = joinedFile.contents.toString();
    if (/\.css/.test(path.extname(joinedFile.path))) {
      joinedFileContent = '@charset "UTF-8";' + '\n' + joinedFileContent;
    }

    joinedFile.contents = new Buffer(joinedFileContent);
    this.push(joinedFile);
    callback();
  });

  return stream;
}

module.exports = concatCore;
