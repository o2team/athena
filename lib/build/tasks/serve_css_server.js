/**
* @fileoverview server模式，serve时css文件处理
* @author  liweitao@jd.com
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var athenaMate = require('../athena_mate');
      var Util = require( '../../util' );
      var autoprefixer = require('autoprefixer');
      var processors = [
        autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1']}),
      ];

      var cssName = path.basename(args.fPath, path.extname(args.fPath)) + '.css';
      if (args.type === 'changed') {
        var fileName = path.basename(args.fPath);
        var cssFile = path.join(modulePath, 'dist', '_', args.serveFolder, fileName);
        var stream = null;

        if (/\.scss|\.sass/.test(args.fPath)) {
          var sasslib = [];
          var gCssDirPath = path.join(appPath, appConf.common, 'static','css');
          var gSassDirPath = path.join(appPath, appConf.common, 'static','sass');
          var mCssDirPath = path.join(modulePath, 'static', 'css');
          var mSassDirPath = path.join(modulePath, 'static', 'sass');
          sasslib.push(gCssDirPath);
          sasslib.push(mCssDirPath);
          if (Util.existsSync(gSassDirPath)) {
            sasslib.push(gSassDirPath);
          }
          if (Util.existsSync(mSassDirPath)) {
            sasslib.push(mSassDirPath);
          }
          stream = vfs.src(cssFile)
            .pipe(athenaMate.buildFilter({
              app: appConf.app,
              module: moduleConf.module,
              cacheFolder: 'sass',
              checkCb: function (item) {
                var fpath = item.path;
                var name = path.basename(fpath, path.extname(fpath));
                var dirname = path.dirname(fpath);
                var cssPath = path.join(dirname, name + '.css');
                return !Util.existsSync(cssPath);
              }
            }))
            .pipe(athenaMate.compass({
              cwd: appPath,
              imagePath: path.join(modulePath, 'static', 'images'),
              sasslib : sasslib
            }))
            on('finish', function () {
              var athenaPath = Util.getAthenaPath();
              var sassCacheFolder = path.join(athenaPath, 'cache', 'build', 'sass', appConf.app, moduleConf.module);
              vfs.src(path.join(modulePath, 'dist', '_', args.serveFolder, cssName), {base: path.join(modulePath, 'dist', '_')})
                .pipe(vfs.dest(sassCacheFolder))
                .on('finish', function () {
                  processCss();
                });
            });
        } else if (/\.less/.test(args.fPath)) {
          stream = vfs.src(cssFile)
            .pipe($.less())
            .pipe(vfs.dest(path.join(modulePath, 'dist', '_', args.serveFolder)))
            on('finish', function () {
              processCss();
            });
        } else {
          processCss();
        }

        function processCss () {
          vfs.src(path.join(modulePath, 'dist', '_', args.serveFolder, cssName))
            .pipe(athenaMate.plumber())
            .pipe($.postcss(processors))
            .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', args.serveFolder)))
            .on('finish', function () {
              console.log(path.join(modulePath, 'dist', '_', args.serveFolder, cssName));
              console.log(path.join(modulePath, 'dist', '_static', args.serveFolder));
              vfs.src(path.join(modulePath, 'dist', '_static', args.serveFolder, cssName))
                .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 's', args.serveFolder)))
                .pipe(athenaMate.replaceServer({
                  cwd: appPath,
                  module: moduleConf.module,
                  serve: true
                }))
                .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module, args.serveFolder)))
                .on('end', function () {
                  resolve();
                })
                .on('error', function () {
                  reject();
                });
            }).on('error', function () {
              reject();
            });
        }
      } else if (args.type === 'deleted') {
        del.sync(path.join(modulePath, 'dist', '_', args.serveFolder, cssName));
        del.sync(path.join(modulePath, 'dist', '_static', args.serveFolder, cssName));
        del.sync(path.join(modulePath, 'dist', 'output', 's', args.serveFolder, cssName));
        del.sync(path.join(appPath, '.temp', appConf.app, moduleConf.module, args.serveFolder, cssName));
      }
    });
  }
}
