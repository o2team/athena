'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var athenaMate = require('../athena_mate');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var fs = require('fs');

      $.util.log($.util.colors.green('开始' + mod + '模块任务athena_mate！'));
      var stream = vfs.src(modulePath + '/page/**/*.html')
          .pipe($.flatten())
          .pipe(athenaMate.scan({
            cwd: appPath,
            module: moduleConf.module
          }))
          .pipe(vfs.dest(modulePath + '/dist'));
        stream.on('end', function () {
          athenaMate.concat({
            cwd: appPath,
            module: moduleConf.module,
            map: 'map.json',
            dest: 'dist',
            end: function () {
              vfs.src(modulePath + '/module-conf.js')
                .pipe(vfs.dest(modulePath + '/dist'))
                .on('finish', function () {
                  $.util.log($.util.colors.green('结束' + mod + '模块任务athena_mate！'));
                  resolve();
                });
            }
          });
        }).on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务athena_mate失败！'));
          reject(err);
        });

    });
  }
}
