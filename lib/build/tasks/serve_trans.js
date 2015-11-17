'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');

      vfs.src([modulePath + '/dist/_/widget/*/images/*', modulePath + '/dist/_/page/*/images/*', modulePath + '/dist/_/static/images/*'])
        .pipe($.flatten())
        .pipe(vfs.dest(modulePath + '/dist/output/images'))
        .on('end', function () {
          vfs.src(modulePath + '/dist/_static/{css,js}/**')
            .pipe(vfs.dest(modulePath + '/dist/output/'))
            .on('end', function () {
              resolve();
            });
        });
    });
  }
}
