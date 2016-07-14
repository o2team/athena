/**
* @fileoverview server模式，同步文件合并
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var _ = require('lodash');
      var es = require('event-stream');

      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      var mapJsonPath = path.join(modulePath, 'dist', 'map.json');
      var mapJson = Util.readJsonFile(mapJsonPath);
      var gbMapJsonPath = path.join(appPath, appConf.common, 'dist', 'map.json');
      var gbMapJson = Util.readJsonFile(gbMapJsonPath);
      if (_.isEmpty(mapJson) || _.isEmpty(gbMapJson)) {
        resolve();
        return;
      }

      var include = mapJson.include;
      var rev = mapJson.rev;
      var gbRev = gbMapJson.rev;
      var pages = [];
      var streamArr = [];
      for (var key in include) {
        var pageName = path.basename(key, path.extname(key));
        pages.push(key);
        var cssArr = getResPathList(include[key].css, rev.css, gbRev.css);
        var jsArr = getResPathList(include[key].js, rev.js, gbRev.js);
        streamArr.push(
          vfs.src(cssArr)
            .pipe(athenaMate.concatCore(pageName + '_all.css'))
            .pipe(athenaMate.csso({
              disableStructureMinimization: true,
              onComplete: function (savedInfo) {
                Util.generateStatistics(modulePath, 'optimize.css', savedInfo);
              }
            }))
            .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 's')))
        );
        streamArr.push(
          vfs.src(jsArr)
            .pipe(athenaMate.concatCore(pageName + '_all.js'))
            .pipe(athenaMate.uglify({
              onComplete: function (savedInfo) {
                Util.generateStatistics(modulePath, 'optimize.js', savedInfo);
              }
            }).on('error', $.util.log))
            .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 's')))
        );
      }

      es.merge(streamArr).on('end', function () {
        resolve();
      });

      function getResPathList (includeRes, rev, gbRev) {
        var arr = [];
        includeRes.forEach(function (item) {
          var itemStr = '';
          if (item.module === appConf.common) {
            itemStr = gbRev[item.name];
          } else {
            itemStr = rev[item.name];
          }
          
          if (itemStr) {
            itemStr = path.join(appPath, item.module, 'dist', 'output', 's', itemStr);
            arr.push(itemStr);
          }
        });
        return arr;
      }
    });
  };
};
