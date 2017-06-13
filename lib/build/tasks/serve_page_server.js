/**
* @fileoverview server模式，serve时页面文件处理
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var athenaMate = require('../athena_mate');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var del = require('del');

      var pageFiles = args.pageFiles;
      if (args.type === 'changed') {
        var stream = vfs.src(pageFiles)
          .pipe($.flatten())
          .pipe(athenaMate.scanServer({
            cwd: appPath,
            module: moduleConf.module,
            serve: true
          }));
        stream.on('finish', function () {
            stream
              .pipe($.flatten())
              .pipe(athenaMate.injectServer({
                cwd: appPath,
                module: moduleConf.module
              }))
              .pipe(athenaMate.replaceServer({
                cwd: appPath,
                module: moduleConf.module,
                refModuleList: moduleConf.refModuleList || [],
                serve: true
              }))
              .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module)))
              .on('end', function () {
                resolve();
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
