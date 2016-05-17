/**
* @fileoverview less编译
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function(mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');

      vfs.src(modulePath + '/dist/_/**/' + '/*.less')
        .on('finish', function () {
          $.util.log($.util.colors.green('开始' + mod + '模块任务的less'));
        })
        .pipe($.less())
        .pipe(vfs.dest(modulePath + '/dist/_'))
        .on('finish', function() {
          $.util.log($.util.colors.green('完成' + mod + '模块任务的less' ));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块的less文件失败！' ));
          reject(err);
        })
        .pipe($.util.noop());
    } );
  };
};
