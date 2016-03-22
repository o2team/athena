'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      vfs.src(path.join(modulePath, 'dist', 'output', '*.html'))
        .pipe($.flatten())
        .pipe(athenaMate.inject({
          cwd: appPath,
          module: moduleConf.module,
          serve: args.isServe ? args.isServe : false,
          useInclude: appConf.useInclude || {},
          shtml: appConf.shtml || { use: false, needCombo: false }
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', 'output')))
        .on('end', function () {
          resolve();
        });
    });
  }
}
