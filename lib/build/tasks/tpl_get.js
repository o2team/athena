/**
* @fileoverview 模板抽离
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var fs = require('fs');
      var vfs = require('vinyl-fs');
      var through2 = require('through2');
      var _ = require('lodash');

      var Util = require('../../util');

      var tplVersionObj = {};
      var tplOutConf = moduleConf.support.tplOut;
      
      return vfs.src(path.join(modulePath, 'dist', '_', 'widget', '**', '*.html'))
        .pipe(through2.obj(function (file, enc, cb) {
          var tplReg = /<script\b[^>]*.*?o2-out-tpl.*?>([\s\S]*?)<\/script>/gi;
          var tplWrapperReg = /o2-out-tpl-wrapper/g;
          var content = file.contents.toString();
          var filename = path.basename(file.path, path.extname(file.path));
          var tplName = filename + '_tpl';
          content = content.replace(tplReg, function (m, $1) {
            var tplContent = $1.replace(/[\n\r]/g, ' ');
            if (tplOutConf && tplOutConf.deleteSpace) {
              tplContent = tplContent.replace(/\s{2,}/g, '');
            }
            var md5 = Util.checksum(new Buffer(tplContent), 16);
            var tplObjString = JSON.stringify({
              'version': md5,
              'time': new Date().getTime(),
              'dom': tplContent
            }, null, 4);
            tplVersionObj[tplName] = md5;
            var type = tplOutConf.type ? tplOutConf.type : 'cmd';
            if (type === 'cmd') {
              tplContent = 'define(function() {\n  return ' + tplObjString + ';\n});';
            } else if (type === 'jsonp') {
              tplContent = 'jsonCallBack_' + tplName + '(' + tplObjString + ')';
            }
            var tplFile = new $.util.File({
              base: path.join(modulePath, 'dist', '_', 'widget'),
              path: path.join(path.dirname(file.path), tplName + '.js'),
              contents: new Buffer(tplContent)
            });
            this.push(tplFile);
            return '';
          }.bind(this)).replace(tplWrapperReg, 'data-tpl="' + tplName + '"');
          file.contents = new Buffer(content);
          this.push(file);
          cb();
        }, function (cb) {
          if (!_.isEmpty(tplVersionObj)) {
            fs.writeFileSync(path.join(modulePath, 'dist', 'tpl_version.json'), JSON.stringify(tplVersionObj, null, 2));
          }
          cb();
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_', 'widget')))
        .on('finish', function() {
          vfs.src(path.join(modulePath, 'dist', '_', 'page', '**', '*.js'))
            .pipe(through2.obj(function (file, enc, cb) {
              var content = file.contents.toString();
              var tplVersionString = JSON.stringify(tplVersionObj, null, 2);
              tplVersionString = 'window.tplVersion = ' + tplVersionString + ';';
              if (Util.regexps.comment.test(content)) {
                var commentStart = -1;
                content = content.replace(Util.regexps.comment, function (m, $1, $2) {
                  if ($2 === 0) {
                    commentStart = 0;
                    return m + '\n' + tplVersionString;
                  }
                  return m;
                });
                if (commentStart === -1) {
                  content = tplVersionString + content;
                }
              } else {
                content = tplVersionString + content;
              }
              file.contents = new Buffer(content);
              this.push(file);
              cb();
            }))
            .pipe(vfs.dest(path.join(modulePath, 'dist', '_', 'page')))
            .on('finish', function() {
              resolve();
            });
        });
    });
  };
};
