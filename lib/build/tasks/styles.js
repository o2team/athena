'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var autoprefixer = require('autoprefixer');
      var vfs = require('vinyl-fs');
      var fs = require('fs');

      var processors = [
        autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1']}),
      ];

      var px2rem = moduleConf.support.px2rem;
      if( px2rem && px2rem.enable !== false ){
        var pxtorem = require('postcss-pxtorem');
        processors.push(pxtorem({
          root_value: px2rem.root_value,
          unit_precision: px2rem.unit_precision,
          prop_white_list: px2rem.prop_white_list,
          selector_black_list: px2rem.selector_black_list,
          replace: px2rem.replace,
          media_query: px2rem.media_query
        }))
      }
      $.util.log($.util.colors.green('开始' + mod + '模块任务styles！'));
      vfs.src([modulePath + '/dist/_static/css/*.css', '!' + modulePath + '/dist/_static/css/*.min.css'])
        .pipe($.postcss(processors))
        .pipe(vfs.dest(modulePath + '/dist/_static/css'))
        .pipe($.csso())
        .pipe($.rename(function (path) {
          path.basename += '.min';
        }))
        .pipe(vfs.dest(modulePath + '/dist/_static/css'))
        .on('end', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务styles！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务styles失败！'));
          reject(err);
        });
    });
  };

};
