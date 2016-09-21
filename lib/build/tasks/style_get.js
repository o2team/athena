/**
* @fileoverview 样式抽离
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
      var glob = require('glob');

      var Util = require('../../util');

      var tplVersionObj = {};
      var tplOutConf = moduleConf.support.tplOut || {
        type: 'cmd',
        deleteSpace: true,
        outCSS: false
      };

      var mapJson = Util.readJsonFile(path.join(modulePath, 'dist', 'map.json'));
      var commonWidgets = [];
      var widgets = [];
      var dependencyAll = mapJson.dependency;
      for (var i in dependencyAll) {
        if (Util.regexps.js.test(i)) {
          dependencyAll[i].forEach(function (widget) {
            var name = widget.widgetName;
            if (widgets.indexOf(name) >= 0) {
              widget.isCommon = true;
              commonWidgets.indexOf(name) < 0 && commonWidgets.push(name);
            }
            widgets.push(name);
          });
        }
      }

      fs.writeFileSync(path.join(modulePath, 'dist', 'map.json'), JSON.stringify(mapJson, null, 2));

      return vfs.src(path.join(modulePath, 'dist', '_static', 'widget', '**', '*_tpl.js'))
        .pipe(through2.obj(function (file, enc, cb) {
          var content = file.contents.toString();
          var dirname = path.dirname(file.path);
          var filename = path.basename(file.path);
          var tplname = path.basename(filename, path.extname(file.path));
          var contentJson = JSON.parse(content);
          var md5 = Util.checksum(new Buffer(content), 16);
          if (tplOutConf.outCSS) {
            var dependency = mapJson.dependency[filename];
            var cssContent = '';
            var widgetCSSGlob = glob.sync(path.join(dirname, '*min.css'));
            widgetCSSGlob.forEach(function (item) {
              cssContent += String(fs.readFileSync(item));
            });
            if (_.isArray(dependency) && dependency.length > 0) {
              dependency.forEach(function (widget) {
                if (commonWidgets.indexOf(widget.widgetName) < 0) {
                  var widgetCSS = path.join(appPath, widget.module, 'dist', '_static', 'widget', widget.widgetName, widget.widgetName + '.min.css');
                  cssContent += String(fs.readFileSync(widgetCSS));
                }
              });
            }
            cssContent = Util.processCss(cssContent, function (value) {
              return '__uri(' + value + ')';
            });
            md5 = Util.checksum(new Buffer(content + cssContent), 16);
            contentJson.style = cssContent;
          }
          contentJson.time = new Date().getTime();
          contentJson.version = md5;
          var tplObjString = JSON.stringify(contentJson, null, 4);
          var type = tplOutConf.type || 'cmd';
          if (type === 'cmd') {
            content = 'define(function() {\n  return ' + tplObjString + ';\n});';
          } else if (type === 'jsonp') {
            content = 'jsonCallBack_' + tplname + '(' + tplObjString + ')';
          }
          tplVersionObj[tplname] = md5;
          file.contents = new Buffer(content);
          this.push(file);
          cb();
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'widget')))
        .on('finish', function() {
          if (!_.isEmpty(tplVersionObj)) {
            fs.writeFileSync(path.join(modulePath, 'dist', 'tpl_version.json'), JSON.stringify(tplVersionObj, null, 2));
          }
          vfs.src(path.join(modulePath, 'dist', '_static', 'page', '**', '*.js'))
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
            .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'page')))
            .on('finish', function() {
              resolve();
            });
        });
    });
  };
};
