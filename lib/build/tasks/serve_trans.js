'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var through2 = require('through2');

      vfs.src(path.join(modulePath, 'dist', '_', '**', 'images', '**'))
      .pipe(through2.obj(function(file, enc, cb){
        if (!file.isDirectory()) {
          var fp = file.path;
          var fb = file.base;
          var fbaseAfter = fp.replace(fb, '');
          var fbaseDist = fb.replace(path.join(modulePath, 'dist'), '');
          if (fbaseDist.indexOf('images') <= 0 && fbaseAfter.indexOf('images') >= 0) {
            fbaseAfter = fbaseAfter.substr(0, fbaseAfter.indexOf('images') + 7);
            file.base = path.join(file.base, fbaseAfter);
          }
          this.push(file);
        }
        cb();
      }))
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
