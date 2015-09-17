'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var athenaMate = require('../athena_mate');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var pngquant = require('imagemin-pngquant');

      $.util.log($.util.colors.green('开始扫描' + mod + '模块所有文件！'));

      vfs.src(modulePath + '/!(dist)/' + '/**')
        .pipe(athenaMate.pre({
          cwd: appPath,
          module: moduleConf.module
        }))
        .pipe($.if(function (file) {
          if (/\.jpg|\.png|\.jpeg|\.gif|\.webp/.test(path.basename(file.path))) {
            return true;
          }
        }, $.imagemin({
          progressive: true,
          interlaced: true,
          svgoPlugins: [{removeViewBox: false}],
          use: [pngquant()]
        })))
        .pipe(vfs.dest(modulePath + '/dist/_'))
        .on('end', function () {
          $.util.log($.util.colors.green('结束扫描' + mod + '模块！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red('扫描' + mod + '模块居然失败！'));
          reject(err);
        });
    });
  }
}
