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
          .pipe(athenaMate.compass({
            cwd: appPath,
            sasslib : sasslib
          }));
      } else if (/\.less/.test(args.cssFile)) {
        stream = vfs.src(args.cssFile)
          .pipe($.less())
          .pipe(vfs.dest(args.fileDest));
      }
      if (stream) {
        stream.on('finish', function () {
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
            var cssFiles = [];
            args.pageFiles.forEach(function (item) {
              var page = path.basename(item, path.extname(item));
              cssFiles.push(modulePath + '/dist/_static/css/' + page + '.css');
              cssFiles.push('!' + modulePath + '/dist/_static/css/' + page + '.min.css');
            });
            vfs.src(cssFiles)
              .pipe($.postcss(processors))
              .pipe(vfs.dest(modulePath + '/dist/_static/css'))
              .on('end', function () {
                vfs.src(modulePath + '/dist/_static/css/**', { base: modulePath + '/dist/_static/css' })
                  .pipe(athenaMate.replace({
                    cwd: appPath,
                    module: moduleConf.module
                  }))
                  .pipe(vfs.dest(appPath + '/.temp/' + moduleConf.module + '/css'))
                  .on('end', function () {
                    resolve();
                  });
              })
              .on('error', function (err) {
                reject(err);
              });
          }
        });
      }
    });
  }
}
