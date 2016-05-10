/**
* @fileoverview 文件拷贝到_static下
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');

      vfs.src(path.join(modulePath, 'dist', '_', '{page,widget,static}', '**', '*.{js,css}'))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')))
        .on('end', function () {
          resolve();
        });
    });
  }
}
