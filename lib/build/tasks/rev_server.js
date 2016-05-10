/**
* @fileoverview server模式，文件加md5并记录关系，同时将文件放入可上线目录
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      vfs.src(path.join(modulePath, 'dist', '_static', '**'))
        .pipe(athenaMate.revServer({
          modulePath: modulePath,
          revName: 'rev'
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 's')))
        .on('end', function () {
          resolve();
        });
    });
  }
}
