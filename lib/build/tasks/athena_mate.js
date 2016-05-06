/**
* @fileoverview client模式专用，执行代码扫描以及文件合并
* @author  liweitao@jd.com
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var athenaMate = require('../athena_mate');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var _ = require('lodash');

      $.util.log($.util.colors.green('开始' + mod + '模块任务athena_mate！'));
      var pages = path.join(modulePath, 'dist', '_', 'page', '**', '*.html');
      if (typeof args.page === 'string') {
        pages = path.join(modulePath, 'dist', '_', 'page', '**', args.page + '.html');
      }
      var shtml = _.clone(appConf.shtml);
      var shtmlConf = (shtml && !_.isEmpty(shtml)) ? shtml : {
        use: false,
        needCombo: false,
        needTimestamp: false
      };
      var useShtml = shtmlConf ? shtmlConf.use : false;
      var stream = vfs.src(pages)
          .pipe(athenaMate.scan({
            cwd: appPath,
            module: moduleConf.module,
            serve: args.isServe ? args.isServe : false,
            useInclude: appConf.useInclude || {},
            useShtml: !!useShtml
          }))
          .pipe($.flatten())
          .pipe(vfs.dest(path.join(modulePath, 'dist', 'output')));
        stream.on('end', function () {
          athenaMate.concat({
            cwd: appPath,
            module: moduleConf.module,
            map: path.join('dist', 'map.json'),
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
