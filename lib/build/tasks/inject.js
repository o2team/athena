/**
* @fileoverview client模式，生成完整html
* @author  liweitao@jd.com
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      var pages = path.join(modulePath, 'dist', 'output', '*.html');
      if (typeof args.page === 'string') {
        pages = path.join(modulePath, 'dist', 'output', args.page + '.html')
      }
      vfs.src(pages)
        .pipe($.flatten())
        .pipe(athenaMate.inject({
          cwd: appPath,
          module: moduleConf.module,
          shtml: appConf.shtml || { use: false, needCombo: false }
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', 'output')))
        .on('end', function () {
          resolve();
        });
    });
  }
}
