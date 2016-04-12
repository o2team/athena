/**
* @fileoverview sass编译
* @author  liweitao@jd.com
*/

'use strict';

module.exports = function($, appConf, moduleConf, args) {
  return function(mod, modulePath, appPath) {
    return new Promise(function(resolve, reject) {
      var fs = require('fs');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var mkdirp = require('mkdirp');
      var through2 = require('through2');
      var del = require('del');
      var _ = require('lodash');

      var Util = require('../../util');
      var athenaMate = require('../athena_mate');

      var sasslib = [];
      var gCssDirPath = path.join(appPath, appConf.common, 'static','css');
      var gSassDirPath = path.join(appPath, appConf.common, 'static','sass');
      var mCssDirPath = path.join(modulePath, 'static', 'css');
      var mSassDirPath = path.join(modulePath, 'static', 'sass');
      var athenaPath = Util.getAthenaPath();
      var sassCacheFolder = path.join(athenaPath, 'cache', 'build', 'sass', appConf.app, moduleConf.module);
      var sassCacheJson = {};
      var sassCacheFilePath = path.join(sassCacheFolder, 'cache.json');
      try {
        sassCacheJson = JSON.parse(fs.readFileSync(sassCacheFilePath));
      } catch (e) {
        sassCacheJson = {};
      }
      sasslib.push(gCssDirPath);
      sasslib.push(mCssDirPath);
      if (Util.existsSync(gSassDirPath)) {
        sasslib.push(gSassDirPath);
      }
      if (Util.existsSync(mSassDirPath)) {
        sasslib.push(mSassDirPath);
      }

      vfs.src([path.join(modulePath, 'dist', '_', '**', '*.scss'), path.join(modulePath, 'dist', '_', '**', '*.sass')])
        .on('finish', function() {
          $.util.log($.util.colors.green( '开始' + mod + '模块任务的sass'));
        })
        .pipe(athenaMate.buildFilter({
          app: appConf.app,
          module: moduleConf.module,
          cacheFolder: 'sass',
          checkCb: function (item) {
            var fpath = item.path;
            var name = path.basename(fpath, path.extname(fpath));
            var dirname = path.dirname(fpath);
            var cssPath = path.join(dirname, name + '.css');
            var staticPath = cssPath.replace(path.join(modulePath, 'dist', '_'), '');
            var cachePath = path.join(sassCacheFolder, staticPath);

            if (!Util.existsSync(cachePath)
              || !Util.existsSync(sassCacheFilePath)
              || _.isEmpty(sassCacheJson)
              || sassCacheJson[fpath] !== Util.checksum(item.contents, 16)) {
              return true;
            }
            vfs.src(cachePath, {base: sassCacheFolder})
              .pipe(vfs.dest(path.join(modulePath, 'dist', '_')))
              .on('finish', function () {
                return false;
              });
          }
        }))
        .pipe(athenaMate.compass({
          cwd: appPath,
          imagePath: path.join(modulePath, 'static', 'images'),
          sasslib : sasslib //全局sass文件 在全局目录的static目录下
        }))
        .on('finish', function() {
          vfs.src(path.join(modulePath, 'dist', '_', '**', '*.css'))
            .pipe(vfs.dest(sassCacheFolder))
            .on('finish', function () {
              $.util.log($.util.colors.green( '完成' + mod + '模块任务的sass' ));
              resolve();
            })
            .on('error', function (err) {
              reject(err);
            });
        })
        .on('error', function(err) {
          $.util.log($.util.colors.red( mod + '模块的sass文件失败！' ));
          reject(err);
        })
        .pipe($.util.noop());
    });
  }
}
