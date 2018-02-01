/**
* @fileoverview client模式，serve时js文件处理
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var athenaMate = require('../athena_mate');
      var useBabel = moduleConf.support.useBabel || { enable: false };
      var enableBabel = useBabel.enable;
      var jsxPragma = useBabel.jsxPragma || 'Nerv.createElement'
      athenaMate.concat({
        cwd: appPath,
        pageFiles: args.pageFiles,
        module: moduleConf.module,
        map: path.join('dist', 'map.json'),
        dest: 'dist',
        end: function () {
          vfs.src(path.join(modulePath, 'dist', '_static', 'js', '**', '*.js'))
            .pipe($.if(enableBabel, athenaMate.babel({
              config: {
                presets: [
                  require('babel-preset-es2015'),
                  require('babel-preset-stage-0')
                ],
                plugins: [
                  require('babel-plugin-transform-es3-member-expression-literals'),
                  require('babel-plugin-transform-es3-property-literals'),
                  [require('babel-plugin-transform-react-jsx'), {
                    pragma: jsxPragma
                  }]
                ]
              },
              fileTest: useBabel.test || /\.js/,
              exclude: useBabel.exclude || []
            })))
            .pipe(athenaMate.replace({
              cwd: appPath,
              module: moduleConf.module,
              serve: true
            }))
            .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module, 'js')))
            .on('end', function () {
              resolve();
            })
            .on('error', function (err) {
              reject(err);
            });
        }
      });
    });
  };
};
