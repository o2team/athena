/**
* @fileoverview 脚本文件处理
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');

      $.util.log($.util.colors.green('开始' + mod + '模块任务scripts！'));
      vfs.src([path.join(modulePath, 'dist', '_static', '**', '*.js'), path.join('!' + modulePath, 'dist', '_static', '**', '*.min.js')])
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')))
        .on('end', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务scripts！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务scripts失败！'));
          reject(err);
        });
    });
  };
};
