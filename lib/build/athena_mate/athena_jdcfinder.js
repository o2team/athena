/**
* @fileoverview 上传到jdcfinder
* @author  liweitao
*/

'use strict';

var through2 = require('through2');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var gutil = require('gulp-util');
var request = require('request');

function jdcFinder (opts) {
  opts = _.assign({
    remotePath: null,
    jfsToken: null,
    erpid: null
  }, opts);
  var files = [];
  var paths = [];
  var fileCount = 0;
  return through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isStream()){
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var finalRemotePath = path.join('/', opts.remotePath, file.relative).replace(/\\/g, '/');
      var stream = fs.createReadStream(file.path);
      files.push(stream);
      paths.push(finalRemotePath);
      var formData = {
        files: [stream],
        paths: [finalRemotePath]
      }
      try {
        request.post({
          url: 'http://jdc.jd.com/jfs/local',
          formData: formData,
          headers: {
            'jfs-token': opts.jfsToken,
            'erpid': opts.erpid
          },
          json: true
        }, function(err, res, data) {
          if (err) {
            gutil.log(gutil.colors.red(err));
            gutil.log(gutil.colors.red(file.path + '上传 finder 失败'));
          }
          if (data) {
            if(_.isArray(data)) {
              data.forEach(function(data, i) {
                gutil.log(gutil.colors.green('✔ ' + data.file + '上传 finder 成功！'));
                fileCount++;
              });
            } else {
              gutil.log(gutil.colors.red(data));
              gutil.log(gutil.colors.red(file.path + '上传 finder 失败'));
            }
          }
          this.push(file);
          callback();
        }.bind(this));
      } catch (e) {
        gutil.log(gutil.colors.red(e));
        gutil.log(gutil.colors.red(file.path + '上传 finder 失败'));
        this.push(file);
        callback();
      }
    }
  }, function (callback) {
    if (fileCount > 0) {
      gutil.log('jdcfinder上传:', gutil.colors.green(fileCount + '个文件上传成功'));
    } else {
      gutil.log('jdcfinder上传:', gutil.colors.yellow('没有文件上传！'));
    }
    callback();
  });
}

module.exports = jdcFinder;
