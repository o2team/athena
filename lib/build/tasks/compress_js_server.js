/**
* @fileoverview server模式专用，JS代码压缩
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var _ = require('lodash');

      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      $.util.log($.util.colors.green('开始' + mod + '模块任务压缩JS文件！'));

      var compressConf = moduleConf.support.compress;
      
      var jsCompressConf = compressConf ? compressConf.js : {};
      var defaultJsCompressConf = {
        onComplete: function (savedInfo) {
          Util.generateStatistics(modulePath, 'optimize.js', savedInfo);
        }
      };
      jsCompressConf = _.assign(defaultJsCompressConf, jsCompressConf);
      vfs.src([path.join(modulePath, 'dist', '_static', '**', '*.js'), path.join('!' + modulePath, 'dist', '_static', '**', '*.min.js')])
        .pipe(athenaMate.uglify(jsCompressConf).on('error', $.util.log))
        .pipe($.rename(function (path) {
          path.basename += '.min';
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')))
        .on('finish', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务压缩JS文件！'));
          resolve();
        }).on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务压缩JS文件失败！'));
          reject(err);
        });
    });
  };
};
