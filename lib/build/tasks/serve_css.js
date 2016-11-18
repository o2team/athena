/**
* @fileoverview client模式，serve时css文件处理
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs');
      var vfs = require('vinyl-fs');
      var path = require('path');
      var through2 = require('through2');
      var autoprefixer = require('autoprefixer');
      var pxtorem = require('postcss-pxtorem');
      var sprites = require('athena-spritesmith');
      var es = require('event-stream');
      var del = require('del');

      var athenaMate = require('../athena_mate');
      var Util = require( '../../util' );

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

      var stream = null;

      if (/\.scss|\.sass/.test(args.cssFile)) {
        
        var cssFiles = [];
        var moduleName = moduleConf.module;
        var athenaPath = Util.getAthenaPath();
        if (args.needGraphCheck) {
          if (moduleName !== appConf.common) {
            var sassGraphJson = Util.readJsonFile(path.join(appPath, moduleName, 'dist', 'sass_graph.json'));
            for (var key in sassGraphJson) {
              if (sassGraphJson[key].imported.indexOf(args.cssFile) >= 0) {
                cssFiles.push(key);
              }
            }
          } else {
            var appSassGraphJson = {};
            var appSassCacheJSon = {};
            var changedModules = [];
            appConf.moduleList.forEach(function (item) {
              appSassGraphJson[item] = Util.readJsonFile(path.join(appPath, item, 'dist', 'sass_graph.json'));
              appSassCacheJSon[item] = Util.readJsonFile(path.join(athenaPath, 'cache', 'build', 'sass', appConf.app, item, 'cache.json'));
            });
            for (var k in appSassGraphJson) {
              for (var j in appSassGraphJson[k]) {
                if (appSassGraphJson[k][j].imported.indexOf(args.cssFile) >= 0) {
                  changedModules.push(k);
                  cssFiles.push(j);
                  delete appSassCacheJSon[k][j];
                }
              }
            }
            for (var i in appSassCacheJSon) {
              if (changedModules.indexOf(i) >= 0) {
                fs.writeFileSync(path.join(athenaPath, 'cache', 'build', 'sass', appConf.app, i, 'cache.json'), JSON.stringify(appSassCacheJSon[i], null, 2));
              }
            }
          }
        }
        cssFiles.push(args.cssFile);
        var generateCssFiles = {};
        cssFiles.forEach(function (item) {
          var moduleName = Util.getModuleInfoViaPath(item, appPath);
          if (!generateCssFiles[moduleName]) {
            generateCssFiles[moduleName] = [];
          }
          generateCssFiles[moduleName].push(item);
        });
        var streamArr = [];
        var gms = Object.keys(generateCssFiles);
        for (var m in generateCssFiles) {
          var sasslib = [];
          var gCssDirPath = path.join(appPath, appConf.common, 'static','css');
          var gSassDirPath = path.join(appPath, appConf.common, 'static','sass');
          var mCssDirPath = path.join(appPath, m, 'static', 'css');
          var mSassDirPath = path.join(appPath, m, 'static', 'sass');
          sasslib.push(gCssDirPath);
          sasslib.push(mCssDirPath);
          if (Util.existsSync(gSassDirPath)) {
            sasslib.push(gSassDirPath);
          }
          if (Util.existsSync(mSassDirPath)) {
            sasslib.push(mSassDirPath);
          }
          streamArr.push(
            vfs.src(generateCssFiles[m])
              .pipe(athenaMate.sassGraph({
                cwd: appPath,
                app: appConf.app,
                module: m,
                map: 'sass_graph.json'
              }))
              .pipe(athenaMate.sassFilter({
                cwd: appPath,
                app: appConf.app,
                module: m,
                moduleList: appConf.moduleList,
                isForce: true,
                checkCb: function (item, forceCheckedFilenames) {
                  var fpath = item.path;
                  var name = path.basename(fpath, path.extname(fpath));
                  var dirname = path.dirname(fpath);
                  var cssPath = path.join(dirname, name + '.css');
                  if (!Util.existsSync(cssPath)) {
                    return true;
                  }
                  if (forceCheckedFilenames.indexOf(fpath) >= 0) {
                    Util.existsSync(cssPath) && del.sync(cssPath);
                    return true;
                  }
                  return false;
                }
              }))
              .pipe(athenaMate.compass({
                cwd: appPath,
                module: moduleConf.module,
                imagePath: path.join(appPath, m, 'static', 'images'),
                generatedImagesPath: path.join(appPath, m, 'static', 'images'),
                sasslib : sasslib
              }))
              .on('data', function () {})
          );
        }
        es.merge(streamArr).on('end', function () {
          var streamArr2 = [];
          for (var mod in generateCssFiles) {
            var sassCacheFolder = path.join(athenaPath, 'cache', 'build', 'sass', appConf.app, mod);
            var cssFiles = generateCssFiles[mod].map(function (item) {
              var cssName = path.basename(item, path.extname(item)) + '.css';
              var cssFileName = path.join(path.dirname(item), cssName);
              return cssFileName;
            });
            streamArr2.push(
              vfs.src(cssFiles, {base: path.join(appPath, mod, 'dist', '_')})
                .pipe(vfs.dest(sassCacheFolder))
            );
          }
          es.merge(streamArr2).on('end', function () {
            gms.reduce(function (prev, curr, index) {
              var p;
              if (curr) {
                p = processCss(curr);
              }
              return p;
            }, Promise.resolve('start'))
            .then(resolve, reject);
          });
        });
      } else if (/\.less/.test(args.cssFile)) {
        stream = vfs.src(args.cssFile)
          .pipe($.less())
          .pipe(vfs.dest(args.fileDest))
          .on('finish', function () {
            processCss(moduleConf.module).then(resolve, reject);
          });
      } else {
        processCss(moduleConf.module).then(resolve, reject);
      }

      function processCss (moduleName) {
        return new Promise(function (res, rej) {
          var fileContents = [];
          athenaMate.concat({
            cwd: appPath,
            pageFiles: args.pageFiles,
            module: moduleName,
            map: path.join('dist', 'map.json'),
            dest: 'dist',
            end: function () {
              vfs.src(path.join(appPath, moduleName, 'dist', '_static', 'css', '**', '*.css'))
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
                .pipe(athenaMate.replace({
                  cwd: appPath,
                  module: moduleName,
                  serve: true
                }))
                .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleName, 'css')))
                .on('end', res)
                .on('error', rej);
            }
          });
        });
      }
    });
  };
};
