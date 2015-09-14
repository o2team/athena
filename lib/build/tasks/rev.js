'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      vfs.src(modulePath + '/dist/_static/{css,js,images}/**')
        .pipe(athenaMate.rev({
          modulePath: modulePath
        }))
        .pipe(vfs.dest(modulePath + '/dist/output'))
        .on('end', function () {
          resolve();
        });
    });
  }
}
