'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var browserSync = require('browser-sync');
      var minimist = require('minimist');
      var vfs = require('vinyl-fs');

      var argv = minimist(process.argv.slice(2));
      var tempFolder = path.join(appPath, '.temp');
      var serverParam = {
        baseDir: tempFolder
      };

      if (argv.page) {
        serverParam.baseDir = [tempFolder, tempFolder + '/' + moduleConf.module];
        serverParam.index = moduleConf.module + '/' + argv.page + '.html'
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
