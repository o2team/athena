/**
* @fileoverview client模式，serve时css文件处理
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
      var sprites = require('postcss-athena-spritesmith');
      var processors = [
        autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1']}),
      ];
      //是否开启雪碧图合并
      var csssprite = moduleConf.support.csssprite;

      if( csssprite && csssprite.enable !== false ){
        var opts = {
          stylesheetPath: path.join(modulePath, 'dist', '_static', 'css'),
          spritePath: path.join(modulePath, 'dist', '_static', 'images', 'sprite.png'),
          retina: csssprite.retina || false,
          rootvalue: csssprite.rootvalue,
          padding: csssprite.padding
        };
      }

      var stream = null;

      if (/\.scss|\.sass/.test(args.cssFile)) {
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
        stream = vfs.src(args.cssFile)
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
            generatedImagesPath: path.join(modulePath, 'static', 'images'),
            sasslib : sasslib
          }))
          .on('finish', function () {
            var athenaPath = Util.getAthenaPath();
            var sassCacheFolder = path.join(athenaPath, 'cache', 'build', 'sass', appConf.app, moduleConf.module);
            var cssName = path.basename(args.cssFile, path.extname(args.cssFile)) + '.css';
            var cssFileName = path.join(path.dirname(args.cssFile), cssName);
            vfs.src(cssFileName, {base: path.join(modulePath, 'dist', '_')})
              .pipe(vfs.dest(sassCacheFolder))
              .on('finish', function () {
                processCss();
              });
          });
      } else if (/\.less/.test(args.cssFile)) {
        stream = vfs.src(args.cssFile)
          .pipe($.less())
          .pipe(vfs.dest(args.fileDest))
          .on('finish', function () {
            processCss();
          });
      } else {
        processCss();
      }

      function processCss () {
        athenaMate.concat({
          cwd: appPath,
          pageFiles: args.pageFiles,
          module: moduleConf.module,
          map: path.join('dist', 'map.json'),
          dest: 'dist',
          end: function () {
            processors.push(sprites(opts));
            vfs.src(path.join(modulePath, 'dist', '_static', 'css', '**', '*.css'))
              .pipe(athenaMate.plumber())
              .pipe($.postcss(processors))
              .pipe(athenaMate.replace({
                cwd: appPath,
                module: moduleConf.module,
                serve: true
              }))
              .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module, 'css')))
              .on('end', function () {
                resolve();
              })
              .on('error', function (err) {
                reject(err);
              });
          }
        });
      }
    });
  };
};
