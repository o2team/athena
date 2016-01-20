'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      vfs.src(modulePath + '/dist/output/*.html')
        .pipe($.flatten())
        .pipe(athenaMate.inject({
          cwd: appPath,
          module: moduleConf.module,
          useShtml: appConf.useShtml || false
        }))
        .pipe(vfs.dest(modulePath + '/dist/output'))
        .on('end', function () {
          resolve();
        });
    });
  }
}
