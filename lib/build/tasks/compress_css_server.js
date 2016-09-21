/**
* @fileoverview server模式专用，css代码压缩
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

      $.util.log($.util.colors.green('开始' + mod + '模块任务压缩CSS文件！'));

      var platform = appConf.platform ? appConf.platform : 'mobile';
      var autoprefixerConf = moduleConf.support.autoprefixer;
      var browsers = [];
      if (autoprefixerConf) {
        browsers = autoprefixerConf[platform];
      } else {
        browsers = ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1'];
      }

      var compressConf = moduleConf.support.compress;
      var cssCompressConf = compressConf ? compressConf.css : {};
      
      var defaultCssCompressConf = {
        autoprefixer: { browsers: browsers, add: true },
        safe: true,
        onComplete: function (savedInfo) {
          Util.generateStatistics(modulePath, 'optimize.css', savedInfo);
        }
      };
      cssCompressConf = _.assign(defaultCssCompressConf, cssCompressConf);
      vfs.src([path.join(modulePath, 'dist', '_static', '**', '*.css'), path.join('!' + modulePath, 'dist', '_static', '**', '*.min.css')])
        .pipe(athenaMate.cssnano(cssCompressConf))
        .pipe($.rename(function (path) {
          path.basename += '.min';
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')))
        .on('finish', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务压缩CSS文件！'));
          resolve();
        }).on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务压缩CSS文件失败！'));
          reject(err);
        });
    });
  };
};
