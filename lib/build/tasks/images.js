'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs');
      var path = require( 'path' );
      var vfs = require('vinyl-fs');
      var Util = require( '../../util' );
      var athenaMate = require('../athena_mate');
      var through2 = require('through2');

      var noImage = (args && args.noImage) ? args.noImage : false;
      var imageminSupport = moduleConf.support.imagemin;
      var imageminExclude = imageminSupport ? imageminSupport.exclude : [];
      $.util.log($.util.colors.green('开始' + mod + '模块任务images！'));
      vfs.src(path.join(modulePath, 'dist', '_', '**', 'images', '**'))
        .pipe(athenaMate.if(!noImage, athenaMate.imagemin({
          exclude: imageminExclude,
          onComplete: function (savedInfo) {
            Util.generateStatistics(modulePath, 'optimize.img', savedInfo);
          }
        })))
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
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'images')))
        .on('end', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务images！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务images失败！'));
          reject(err);
        });
    });
  };
};
