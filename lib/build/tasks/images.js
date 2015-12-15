'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs');
      var path = require( 'path' );
      var vfs = require('vinyl-fs');
      var pngquant = require('imagemin-pngquant');
      var Util = require( '../../util' );
      var athenaMate = require('../athena_mate');

      var noImage = (args && args.noImage) ? args.noImage : false;

      $.util.log($.util.colors.green('开始' + mod + '模块任务images！'));

      vfs.src([modulePath + '/dist/_/widget/*/images/*', modulePath + '/dist/_/page/*/images/*', modulePath + '/dist/_/static/images/*'])
        .pipe($.if(!noImage, athenaMate.imagemin({
          progressive: true,
          interlaced: true,
          svgoPlugins: [{
            removeViewBox: false
          }],
          use: [pngquant()],
          onComplete: function (savedInfo) {
            var dest = path.join(modulePath, 'dist');
            var statisticsPath = path.join(dest, 'statistics.json');
            var statisticsJson = {};
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest);
            }

            if (fs.existsSync(statisticsPath)) {
              statisticsJson = fs.readFileSync(path.join(dest, 'statistics.json'));
            }

            if (!statisticsJson.optimize) {
              statisticsJson.optimize = {};
            }
            statisticsJson.optimize.img = savedInfo;
            fs.writeFileSync(path.join(dest, 'statistics.json'), JSON.stringify(statisticsJson, null, 2));
          }
        })))
        .pipe($.flatten())
        .pipe(vfs.dest(modulePath + '/dist/_static/images'))
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
