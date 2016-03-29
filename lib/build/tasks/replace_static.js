'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      var isPack = (args && args.pack) ? args.pack : false;
      var isCompress = (args && args.compress) ? args.compress : false;
      var remoteName = (args && args.remote) ? args.remote : 'local';
      vfs.src(path.join(modulePath, 'dist', '_static', '{css,js}', '**'))
        .pipe(athenaMate.replace({
          cwd: appPath,
          module: moduleConf.module,
          pack: isPack,
          serve: false,
          compress: isCompress,
          replaceType: remoteName
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')))
        .on('end', function () {
          resolve();
        });
    });
  }
}
