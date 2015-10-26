'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var browserSync = require('browser-sync');
      var vfs = require('vinyl-fs');

      var page = args ? args.page : undefined;
      var tempFolder = path.join(appPath, '.temp');
      var serverParam = {
        baseDir: tempFolder
      };

      if (page) {
        serverParam.baseDir = [tempFolder, tempFolder + '/' + moduleConf.module];
        serverParam.index = moduleConf.module + '/' + page + '.html'
      }
      $.util.log($.util.colors.green('预览' + mod + '模块...'));
      browserSync({
        notify: false,
        port: 3001,
        server: serverParam
      });
      resolve();
    });
  };
};
