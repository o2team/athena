'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
        var path = require('path');
        var vfs = require('vinyl-fs');
        var fs = require('fs');
        var path = require('path');
        var FontCompress = require('../font_compress');
        $.util.log($.util.colors.green('开始' + mod + '模块任务font！'));

        new FontCompress([modulePath + '/page/*.html'], {

            // 忽略的文件规则。
            ignore: ['*.eot', 'icons.css', 'font?name=*'],

            // dest path
            dest: modulePath + '/dist/_/',
            modulePath: modulePath

        }).then(function (webFonts) {
          if (webFonts.length === 0) {
              console.log('web font not found');
              return;
          }
          webFonts.forEach(function (webFont) {
              console.log('Font name:', webFont.name);
              webFont.files.forEach(function (file) {
                  if (fs.existsSync(file)) {
                      // console.log('File', path.relative('./', file),
                      //     'created:', fs.statSync(file).size / 1000, 'KB');
                  } else {
                      console.error('File', path.relative('./', file), 'not created');
                  }
              });
          });
          $.util.log($.util.colors.green('结束' + mod + '模块任务font！'));

          resolve();
      })
      .catch(function (errors) {
           $.util.log($.util.colors.red(mod + '模块任务font失败！'));
          reject(errors);
      });

    });
  }
}
