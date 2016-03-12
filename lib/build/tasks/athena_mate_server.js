'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var athenaMate = require('../athena_mate');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var es = require('event-stream');
      var _ = require('lodash');

      // 通过读取static-conf配置来进行资源合并
      function concactStatic (modulePath, cb) {
        var streamArr = [];
        var staticPath = require(path.join(modulePath, 'static-conf')).staticPath;
        if (_.isEmpty(staticPath)) {
          cb();
          return;
        }
        for (var key in staticPath) {
          // css
          if (path.extname(key).indexOf('css') >= 0) {
            streamArr.push(vfs
              .src(staticPath[key].map(function (item) {
                return path.join(modulePath, 'dist', '_', item);
              }))
              .pipe(athenaMate.concatCore(key))
              .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'static', 'css'))));
          }

          // js
          if (path.extname(key).indexOf('js') >= 0) {
            streamArr.push(vfs
              .src(staticPath[key].map(function (item) {
                return path.join(modulePath, 'dist', '_', item);
              }))
              .pipe(athenaMate.concatCore(key))
              .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'static', 'js'))));
          }
        }
        es.merge(streamArr).on('end', function () {
          cb();
        });
      }

      $.util.log($.util.colors.green('开始' + mod + '模块任务athena_mate！'));
      var stream = vfs.src(path.join(modulePath, 'dist', '_', 'page', '**', '*.?(html|php|vm|ejs)'))
          .pipe(athenaMate.scanServer({
            cwd: appPath,
            module: moduleConf.module
          }))
          .pipe($.flatten())
          .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 'tpl')));
      stream.on('end', function () {
        concactStatic(modulePath, function () {
          vfs.src(path.join(modulePath, 'module-conf.js'))
            .pipe(vfs.dest(path.join(modulePath, 'dist')))
            .on('finish', function () {
              $.util.log($.util.colors.green('结束' + mod + '模块任务athena_mate！'));
              resolve();
            });
        });
      }).on('error', function (err) {
        $.util.log($.util.colors.red(mod + '模块任务athena_mate失败！'));
        reject(err);
      });
    });
  }
}
