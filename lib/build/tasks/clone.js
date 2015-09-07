'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (modulePath, appPath, widget, source, dest) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');

      // 拷贝一个widget
      if (!widget) {
        $.util.log($.util.colors.red('请输入widget来源和widget名称'));
        reject();
        return;
      }
      vfs.src(appPath + '/' + source + '/widget/' + widget + '/**')
        .pipe($.rename(function (path) {
          if (path.basename !== 'images' && path.dirname !== 'images' && path.basename !== '') {
            path.basename = source + '_' + path.basename;
          }
        }))
        .pipe(vfs.dest(path.join(appPath, dest, 'widget', source + '_' + widget)))
        .on('end', function () {
          $.util.log($.util.colors.green('从' + source + '中拷贝组件' + widget + '成功！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red('拷贝失败~'));
          reject(err);
        });
    });
  }
}
