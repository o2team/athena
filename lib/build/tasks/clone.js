/**
* @fileoverview 组件复制逻辑
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (modulePath, appPath, widget, source, dest) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var Util = require('../../util');

      // 拷贝一个widget
      if (!widget) {
        $.util.log($.util.colors.red('请输入widget来源和widget名称'));
        reject();
        return;
      }
      var sourceWidgetPath = path.join(appPath, source, 'widget', widget);
      if (!Util.existsSync(sourceWidgetPath)) {
        $.util.log($.util.colors.red('widget ' + widget +' 不存在！'));
        reject();
        return;
      }
      vfs.src(path.join(sourceWidgetPath, '**'))
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
