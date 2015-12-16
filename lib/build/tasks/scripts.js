'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');

      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      $.util.log($.util.colors.green('开始' + mod + '模块任务scripts！'));
      vfs.src([modulePath + '/dist/_static/js/*.js', '!' + modulePath + '/dist/_static/js/*.min.js'])
        .pipe(athenaMate.uglify({
          onComplete: function (savedInfo) {
            Util.generateStatistics(modulePath, 'optimize.js', savedInfo);
          }
        }))
        .pipe($.rename(function (path) {
          path.basename += '.min';
        }))
        .pipe(vfs.dest(modulePath + '/dist/_static/js'))
        .on('end', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务scripts！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务scripts失败！'));
          reject(err);
        });
    });
  }
}
