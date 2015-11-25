'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var autoprefixer = require('autoprefixer');
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var sprites = require('postcss-athena-spritesmith'); 
      var pxtorem = require('postcss-pxtorem');

      //是否开启px转rem
      var px2rem = moduleConf.support.px2rem;
      //是否开启雪碧图合并
      var csssprite = moduleConf.support.csssprite;

      var processors = [
        autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1']}),
      ];
      
      if( px2rem && px2rem.enable !== false ){        
        processors.push(pxtorem({
          root_value: px2rem.root_value,
          unit_precision: px2rem.unit_precision,
          prop_white_list: px2rem.prop_white_list,
          selector_black_list: px2rem.selector_black_list,
          replace: px2rem.replace,
          media_query: px2rem.media_query
        }))
      }   
      
      if( csssprite && csssprite.enable !== false ){
        var opts = {
          stylesheetPath: modulePath + '/dist/_static/css/',
          spritePath: modulePath + '/dist/_static/images/sprite.png',
          retina: csssprite.retina || false,
          rootvalue: csssprite.rootvalue
        }        
      }
      
      $.util.log($.util.colors.green('开始' + mod + '模块任务styles！'));
      vfs.src([modulePath + '/dist/_static/css/*.css', '!' + modulePath + '/dist/_static/css/*.min.css'])
        .pipe($.postcss(processors))
        .pipe(vfs.dest(modulePath + '/dist/_static/css'))  
        .pipe(
          $.postcss([
            sprites(opts)
          ])
        )
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
