/**
* @fileoverview css语法检查
* @author  liweitao@jd.com
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var csslint = require('csslint').CSSLint;
      
      var athenaMate = require('../athena_mate');

      //是否开启csslint
      var support = moduleConf.support;
      var csslint = support.csslint;

      if( csslint && csslint.enable !== false ){
        $.util.log($.util.colors.green('开始' + mod + '模块任务csslint！'));
        vfs.src(path.join(modulePath, 'dist', '_', '**', '*.css'))
          .pipe(athenaMate.csslint({
            cwd: appPath,
            module: moduleConf.module,
            csslintrc: path.join(appPath, '.csslintrc')
          }))
          .on('finish', function () {
            $.util.log($.util.colors.green('结束' + mod + '模块任务csslint！'));
            resolve();
          })
          .on('error', function (err) {
            $.util.log($.util.colors.red(mod + '模块任务csslint失败！'));
            reject(err);
          });
      } else {
        resolve();
      }
    });
  };

};
