/**
* @fileoverview 复制文件
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');

      return vfs.src(args.src)
        .pipe(vfs.dest(args.dest))
        .on('finish', function() {
          resolve();
        }).on('err', function (err) {
          reject(err);
        });
    });
  };
};
