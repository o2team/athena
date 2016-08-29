/**
* @fileoverview client模式，serve时页面文件处理
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var through2 = require('through2');
      var autoprefixer = require('autoprefixer');
      var pxtorem = require('postcss-pxtorem');
      var sprites = require('athena-spritesmith');
      var del = require('del');

      var athenaMate = require('../athena_mate');

      //是否开启px转rem
      var px2rem = moduleConf.support.px2rem;
      //是否开启雪碧图合并
      var csssprite = moduleConf.support.csssprite;
      var platform = appConf.platform ? appConf.platform : 'mobile';

      var autoprefixerConf = moduleConf.support.autoprefixer;
      var browsers = [];
      if (autoprefixerConf) {
        browsers = autoprefixerConf[platform];
      } else {
        browsers = ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1'];
      }

      var processors = [
        autoprefixer({browsers: browsers})
      ];
      
      if(px2rem && px2rem.enable !== false){
        processors.push(pxtorem({
          root_value: px2rem.root_value,
          unit_precision: px2rem.unit_precision,
          prop_white_list: px2rem.prop_white_list,
          selector_black_list: px2rem.selector_black_list,
          replace: px2rem.replace,
          media_query: px2rem.media_query
        }));
      }

      if(csssprite && csssprite.enable !== false){
        var opts = {
          outputDimensions: true,
          stylesheetPath: path.join(modulePath, 'dist', '_static', 'css'),
          imageFolder: 'images',
          spritePath: path.join(modulePath, 'dist', '_static', 'images', csssprite.spriteFolder ? csssprite.spriteFolder : '', 'sprite.png'),
          retina: csssprite.retina || false,
          rootValue: csssprite.rootValue,
          padding: csssprite.padding,
          groupBy: function (image) {
            return image.urlSpe;
          }
        };
      }

      var pageFiles = args.pageFiles;
      if (args.type === 'changed') {
        var stream = vfs.src(pageFiles)
          .pipe($.flatten())
          .pipe(athenaMate.scan({
            cwd: appPath,
            module: moduleConf.module,
            serve: true
          }));
        stream.on('finish', function () {
          stream
            .pipe($.flatten())
            .pipe(athenaMate.replace({
              cwd: appPath,
              module: moduleConf.module,
              serve: true
            }))
            .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module)))
            .on('end', function () {
              var fileContents = [];
              athenaMate.concat({
                cwd: appPath,
                pageFiles: pageFiles,
                module: moduleConf.module,
                map: path.join('dist', 'map.json'),
                dest: 'dist',
                end: function () {
                  vfs.src(path.join(modulePath, 'dist', '_static', 'css', '**', '*.css'))
                    .pipe(athenaMate.plumber())
                    .pipe($.postcss(processors))
                    .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'css')))
                    .pipe(through2.obj(function (file, enc, cb) {
                      if (file.isNull() || file.isStream()) {
                        return cb(null, file);
                      }
                      fileContents.push('/*filename=' + path.basename(file.path) + '*/\n' + file.contents.toString());
                      cb();
                    }, function (cb) {
                      var file = new $.util.File({
                        path: path.join(modulePath, 'dist', '_static', 'css', 'sprite.css'),
                        base: path.join(modulePath, 'dist', '_static', 'css'),
                        contents: new Buffer(fileContents.join('\n/*sprite_file_split*/\n'))
                      });
                      this.push(file);
                      cb();
                    }))
                    .pipe($.postcss([sprites(opts)]))
                    .pipe(through2.obj(function (file, enc, cb) {
                      if (file.isNull() || file.isStream()) {
                        return cb(null, file);
                      }
                      var content = file.contents.toString();
                      fileContents = content.split('/*sprite_file_split*/');
                      fileContents.forEach(function (item) {
                        var reg = /filename=(.*)\*/;
                        var filename = item.match(reg)[1];
                        var filedir = path.join(modulePath, 'dist', '_static', 'css');
                        var file = new $.util.File({
                          path: path.join(filedir, filename),
                          base: filedir,
                          contents: new Buffer(item)
                        });
                        this.push(file);
                      }.bind(this));
                      cb();
                    }))
                    .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'css')))
                    .on('end', function () {
                      vfs.src(path.join(modulePath, 'dist', '_static', '**'), { base: path.join(modulePath, 'dist', '_static') })
                        .pipe(athenaMate.replace({
                          cwd: appPath,
                          module: moduleConf.module,
                          serve: true
                        }))
                        .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module)))
                        .on('end', function () {
                          resolve();
                        });
                    })
                    .on('error', function (err) {
                      reject(err);
                    });
                }
              });
            });
          }).on('error', function (err) {
            $.util.log($.util.colors.red(mod + '重新serve page失败！'));
            reject(err);
          });
      } else if (args.type === 'deleted') {
        pageFiles.forEach(function (item) {
          var page = path.basename(item);
          del.sync(path.join(appPath, '.temp', appConf.app, moduleConf.module, page));
          resolve();
        });
      } else {
        resolve();
      }
    });
  };
};
