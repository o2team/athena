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
