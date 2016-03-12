'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var path = require('path');
      var es = require('event-stream');

      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      $.util.log($.util.colors.green('开始' + mod + '模块任务压缩文件！'));

      var compressCss = vfs.src([path.join(modulePath, 'dist', '_static', '**', '*.css'), path.join('!' + modulePath, 'dist', '_static', '**', '*.min.css')])
        .pipe(athenaMate.csso({
          disableStructureMinimization: true,
          onComplete: function (savedInfo) {
            Util.generateStatistics(modulePath, 'optimize.css', savedInfo);
          }
        }))
        .pipe($.rename(function (path) {
          path.basename += '.min';
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')));

      var compressJs = vfs.src([path.join(modulePath, 'dist', '_static', '**', '*.js'), path.join('!' + modulePath, 'dist', '_static', '**', '*.min.js')])
        .pipe(athenaMate.uglify({
          onComplete: function (savedInfo) {
            Util.generateStatistics(modulePath, 'optimize.js', savedInfo);
          }
        }))
        .pipe($.rename(function (path) {
          path.basename += '.min';
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')));

      es.merge(compressCss, compressJs).on('end', function () {
        $.util.log($.util.colors.green('结束' + mod + '模块任务压缩文件！'));
        resolve();
      }).on('error', function (err) {
        $.util.log($.util.colors.red(mod + '模块任务压缩文件失败！'));
        reject(err);
      });
    });
  };
};
