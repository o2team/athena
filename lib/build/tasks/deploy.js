'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      var deploy = appConf.deploy;
      var qiang = deploy.qiang;
      $.util.log($.util.colors.green('开始部署' + moduleConf.module + '！'));
      // deploy时替换地址

      vfs.src(modulePath + '/dist/**', { base: modulePath + '/dist' })
        .pipe(athenaMate.replace({
          cwd: appPath,
          module: moduleConf.module,
          replaceType: 'qiang'
        }))
        .pipe($.ftp({
          host: qiang.host,
          user: qiang.user,
          pass: qiang.pass,
          port: qiang.port,
          remotePath: qiang.remotePath + '/' + moduleConf.module
        }))
        .pipe($.util.noop())
        .on('finish', function () {
          $.util.log($.util.colors.green('模块' + mod + '部署完成！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red('模块' + mod + '部署可能出现问题！'));
          reject(err);
        });
    });
  };
};
