'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var athenaMate = require('../athena_mate');

      athenaMate.concat({
        cwd: appPath,
        pageFiles: args.pageFiles,
        module: moduleConf.module,
        map: path.join('dist', 'map.json'),
        dest: 'dist',
        end: function () {
          var jsFiles = [];
          args.pageFiles.forEach(function (item) {
            var page = path.basename(item, path.extname(item));
            jsFiles.push(path.join(modulePath, 'dist', '_static', 'js', page + '.js'));
          });
          vfs.src(jsFiles)
            .pipe(athenaMate.replace({
              cwd: appPath,
              module: moduleConf.module,
              serve: true
            }))
            .pipe(vfs.dest(path.join(appPath, '.temp', moduleConf.module, 'js')))
            .on('end', function () {
              resolve();
            })
            .on('error', function (err) {
              reject(err);
            });
        }
      });
    });
  }
}
