/**
* @fileoverview sass编译
* @author  liweitao
*/

'use strict';

module.exports = function($, appConf, moduleConf, args) {
  return function(mod, modulePath, appPath) {
    return new Promise(function(resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var _ = require('lodash');
      var del = require('del');
      var through2 = require('through2');

      var Util = require('../../util');
      var athenaMate = require('../athena_mate');

      var sasslib = [];
      var gCssDirPath = path.join(appPath, appConf.common, 'static','css');
      var gSassDirPath = path.join(appPath, appConf.common, 'static','sass');
      var mCssDirPath = path.join(modulePath, 'static', 'css');
      var mSassDirPath = path.join(modulePath, 'static', 'sass');
      var athenaPath = Util.getAthenaPath();
      var sassCacheFolder = path.join(athenaPath, 'cache', 'build', 'sass', appConf.app, moduleConf.module);
      var sassCacheFilePath = path.join(sassCacheFolder, 'cache.json');
      var sassCacheJson = Util.readJsonFile(sassCacheFilePath);
      sasslib.push(gCssDirPath);
      sasslib.push(mCssDirPath);
      if (Util.existsSync(gSassDirPath)) {
        sasslib.push(gSassDirPath);
      }
      if (Util.existsSync(mSassDirPath)) {
        sasslib.push(mSassDirPath);
      }
      
      vfs.src(path.join(sassCacheFolder, '**', '*.css'), {base: sassCacheFolder})
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_')))
        .on('finish', function () {
          vfs.src([path.join(modulePath, 'dist', '_', '**', '*.scss'), path.join(modulePath, 'dist', '_', '**', '*.sass')])
            .on('finish', function() {
              $.util.log($.util.colors.green( '开始' + mod + '模块任务的sass'));
            })
            .pipe(athenaMate.sassGraph({
              cwd: appPath,
              app: appConf.app,
              module: moduleConf.module,
              map: 'sass_graph.json'
            }))
            .pipe(athenaMate.sassFilter({
              cwd: appPath,
              app: appConf.app,
              module: moduleConf.module,
              moduleList: appConf.moduleList,
              common: appConf.common,
              checkCb: function (item, forceCheckedFilenames) {
                var fpath = item.path;
                var name = path.basename(fpath, path.extname(fpath));
                var dirname = path.dirname(fpath);
                var cssPath = path.join(dirname, name + '.css');
                var staticPath = cssPath.replace(path.join(modulePath, 'dist', '_'), '');
                var cachePath = path.join(sassCacheFolder, staticPath);

                if (!Util.existsSync(cachePath)
                  || !Util.existsSync(sassCacheFilePath)
                  || _.isEmpty(sassCacheJson)
                  || forceCheckedFilenames.indexOf(fpath) >= 0
                  || sassCacheJson[fpath] !== Util.checksum(item.contents, 16)) {
                  Util.existsSync(cssPath) && del.sync(cssPath);
                  return true;
                }
                return false;
              }
            }))
            .pipe(athenaMate.compass({
              cwd: appPath,
              imagePath: path.join(modulePath, 'static', 'images'),
              generatedImagesPath: path.join(modulePath, 'static', 'images'),
              sasslib : sasslib //全局sass文件 在全局目录的static目录下
            }))
            .on('data', function () {})
            .on('finish', function() {
              vfs.src(path.join(modulePath, 'dist', '_', '**', '*.css'))
                .pipe(through2.obj(function (file, encoding, cb) { // 只有统计目录下有同名的scss文件才会被拷贝
                  if (file.isNull() || file.isStream()) {
                    return cb(null, file);
                  }
                  var fpath = file.path;
                  var scssPath = fpath.replace(path.extname(fpath), '') + '.scss';
                  if (Util.existsSync(scssPath)) {
                    this.push(file);
                  }
                  cb();
                }))
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
    });
  };
};
