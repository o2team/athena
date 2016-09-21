/**
* @fileoverview server模式专用，执行代码扫描以及文件合并
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var athenaMate = require('../athena_mate');
      var path = require('path');
      var vfs = require('vinyl-fs');

      var isRelease = (args && args.release) ? args.release : false;
      var beauty = moduleConf.support.beauty || {
        enable: false
      };

      $.util.log($.util.colors.green('开始' + mod + '模块任务athena_mate！'));
      var stream = vfs.src(path.join(modulePath, 'dist', '_', 'page', '**', '*.?(html|php|vm|ejs)'))
          .pipe(athenaMate.scanServer({
            cwd: appPath,
            module: moduleConf.module,
            isRelease: isRelease,
            beauty: beauty.enable
          }))
          .pipe($.flatten())
          .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 'tpl')));
      stream.on('end', function () {
        athenaMate.concatServer({
          cwd: appPath,
          module: moduleConf.module,
          dest: 'dist',
          end: function () {
            vfs.src(path.join(modulePath, 'module-conf.js'))
              .pipe(vfs.dest(path.join(modulePath, 'dist')))
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
  };
};
