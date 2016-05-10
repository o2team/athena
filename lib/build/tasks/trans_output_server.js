/**
* @fileoverview 文件拷贝到output下
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');

      vfs.src(path.join(modulePath, 'dist', '_static', '**'))
        .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 's')))
        .on('end', function () {
          resolve();
        });
    });
  }
}
