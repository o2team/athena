/**
* @fileoverview 楼层模板代码处理
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var through2 = require('through2');

      var Util = require('../../util');
      
      var mapJsonPath = path.join(modulePath, 'dist', 'map.json');
      var mapJson = {};
      try {
        mapJson = JSON.parse(String(fs.readFileSync(mapJsonPath)));
      } catch (e) {
        mapJson = {};
      }
      var dependency = mapJson.dependency;
      var floorList = [];
      for (var i in dependency) {
        dependency[i].forEach(function (item) {
          if (item.widgetType === 'floor' 
            && floorList.indexOf(item.widgetName) < 0) {
            floorList.push(item.widgetName);
          }
        });
      }
      if (floorList.length === 0) {
        return resolve();
      }
      var floorTpls = floorList.map(function (item) {
        return path.join(modulePath, 'dist', '_', 'widget', item, item + '.html');
      });
      vfs.src(floorTpls)
        .pipe(through2.obj(function (file, enc, cb) {
          if (file.isNull() || file.isStream()) {
            return cb(null, file);
          }
          var content = file.contents.toString();
          var firstHtmlTagIndex = 0;
          content = content.split('\n');
          content.every(function (item, index) {
            if (Util.regexps.htmlTag.test(item)) {
              firstHtmlTagIndex = index;
              return false;
            }
            return true;
          });
          content.splice(firstHtmlTagIndex, 0 ,'{$portal_floor_id = $portal_floor_id + 1}');
          content = content.join('\n');
          content = content.replace(Util.regexps.doubleBraceInterpolate, function (m, $1, $2) {
            if ($1.indexOf('cell_') >= 0) {
              if ($1.indexOf('*') >= 0) {
                var cellArr = [];
                var cellData = [];
                cellArr = $1.split('*');
                return '{{' + cellArr[0] + '}}';
              }
            }
            return m;
          });
          file.contents = new Buffer(content);
          this.push(file);
          cb();
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 'tpl', 'floors')))
        .on('end', function () {
          resolve();
        })
        .on('error', function (err) {
          reject(err);
        });
    });
  };
};
