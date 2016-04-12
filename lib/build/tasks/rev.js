/**
* @fileoverview client模式，生成完整html
* @author  liweitao@jd.com
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      vfs.src(path.join(modulePath, 'dist', '_static', '{css,js,images}', '**'))
        .pipe(athenaMate.rev({
          modulePath: modulePath,
          revName: 'rev'
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', 'output')))
        .on('end', function () {
          resolve();
        });
    });
  }
}
