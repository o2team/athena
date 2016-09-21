/**
* @fileoverview 模板抽离
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var through2 = require('through2');

      var athenaMate = require('../athena_mate');

      var tplOutConf = moduleConf.support.tplOut || {
        deleteSpace: true
      };
      var beauty = moduleConf.support.beauty || {
        enable: false
      };
      var isRelease = (args && args.release) ? args.release : false;

      return vfs.src(path.join(modulePath, 'dist', '_', 'widget', '**', '*.html'))
        .pipe(through2.obj(function (file, enc, cb) {
          var tplReg = /<script\b[^>]*.*?o2-out-tpl.*?>([\s\S]*?)<\/script>/gi;
          var tplWrapperReg = /o2-out-tpl-wrapper/g;
          var content = file.contents.toString();
          var filename = path.basename(file.path, path.extname(file.path));
          var tplName = filename + '_tpl';
          content = content.replace(tplReg, function (m, $1) {
            var tplFile = new $.util.File({
              base: path.join(modulePath, 'dist', '_', 'widget'),
              path: path.join(path.dirname(file.path), tplName + '.js'),
              contents: new Buffer($1)
            });
            this.push(tplFile);
            return '';
          }.bind(this)).replace(tplWrapperReg, 'data-tpl="' + tplName + '"');
          file.contents = new Buffer(content);
          this.push(file);
          cb();
        }))
        .pipe($.if('*.js', athenaMate.scanServer({
          cwd: appPath,
          module: moduleConf.module,
          isRelease: isRelease,
          needScript: false,
          beauty: beauty.enable
        })))
        .pipe($.if('*.js', through2.obj(function (file, enc, cb) {
          var content = file.contents.toString();
          content = content.replace(/[\n\r]/g, ' ');
          if (tplOutConf && tplOutConf.deleteSpace) {
            content = content.replace(/\s{2,}/g, '');
          }
          var tplObjString = JSON.stringify({
            'dom': content
          }, null, 4);
          
          file.contents = new Buffer(tplObjString);
          this.push(file);
          cb();
        })))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_', 'widget')))
        .on('finish', function() {
          resolve();
        });
    });
  };
};
