'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var pngquant = require('imagemin-pngquant');
      var vfs = require('vinyl-fs');
      $.util.log($.util.colors.green('开始' + mod + '模块任务images！'));
      vfs.src([modulePath + '/widget/*/images/*', modulePath + '/page/*/images/*', modulePath + '/static/images/*'])
        .pipe($.flatten())
        .pipe($.imagemin({
          progressive: true,
          interlaced: true,
          svgoPlugins: [{removeViewBox: false}],
          use: [pngquant()]
        }))
        .pipe(vfs.dest(modulePath + '/dist/_static/images'))
        .on('end', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务images！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务images失败！'));
          reject(err);
        });
    });
  };
};
