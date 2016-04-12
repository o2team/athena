/**
* @fileoverview 图片压缩
* @author  liweitao@jd.com
*/

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
      var athenaPath = Util.getAthenaPath();
      var imagesCacheFolder = path.join(athenaPath, 'cache', 'build', 'images', appConf.app, moduleConf.module, 'images');
      $.util.log($.util.colors.green('开始' + mod + '模块任务images！'));

      vfs.src(path.join(modulePath, 'dist', '_', '**', 'images', '**'))
        .pipe(athenaMate.buildFilter({
          app: appConf.app,
          module: moduleConf.module,
          cacheFolder: 'images',
          checkCb: function (item) {
            var staticPath = Util.getStaticPath(item.path).path;
            var fPath = path.join(modulePath, 'dist', '_static', staticPath);
            var cachePath = path.join(athenaPath, 'cache', 'build', 'images', appConf.app, moduleConf.module, staticPath);
            if (!Util.existsSync(cachePath)) {
              return true;
            }
            vfs.src(cachePath, {base: imagesCacheFolder})
              .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'images')))
              .on('finish', function () {
                return false;
              });
          }
        }))
        .pipe(athenaMate.if(!noImage, athenaMate.imagemin({
          app: appConf.app,
          module: moduleConf.module,
          cacheFolder: 'images',
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
        .on('finish', function () {
          vfs.src(path.join(modulePath, 'dist', '_static', 'images', '**'))
            .pipe(vfs.dest(imagesCacheFolder))
            .on('finish', function () {
              $.util.log($.util.colors.green('结束' + mod + '模块任务images！'));
              resolve();
            });
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务images失败！'));
          reject(err);
        });
    });
  };
};
