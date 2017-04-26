/**
* @fileoverview server模式，serve时js文件处理
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var athenaMate = require('../athena_mate');
      var del = require('del');

      var useBabel = moduleConf.support.useBabel || { enable: false };
      var enableBabel = useBabel.enable;

      var jsName = path.basename(args.fPath, path.extname(args.fPath)) + '.js';
      if (args.type === 'changed') {
        vfs.src(args.fPath)
          .pipe(vfs.dest(path.join(modulePath, 'dist', '_', args.serveFolder)))
          .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', args.serveFolder)))
          .pipe($.if(enableBabel, athenaMate.babel({
            config: {
              presets: [
                [require('babel-preset-es2015').buildPreset, {
                  'loose': true
                }],
                require('babel-preset-stage-0')
              ],
              plugins: [
                [require('babel-plugin-transform-react-jsx'), {
                  pragma: 'Base.createElement'
                }]
              ]
            },
            fileTest: useBabel.test || /\.js/,
          })))
          .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 's', args.serveFolder)))
          .on('end', function () {
            vfs.src(path.join(modulePath, 'dist', 'output', 's', args.serveFolder, jsName))
              .pipe(athenaMate.replaceServer({
                cwd: appPath,
                module: moduleConf.module,
                serve: true
              }))
              .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module, args.serveFolder)))
              .on('end', function () {
                resolve();
              })
              .on('error', function () {
                reject();
              });
          })
          .on('error', function () {
            reject();
          });
      } else if (args.type === 'deleted') {
        del.sync(path.join(modulePath, 'dist', '_', args.serveFolder, jsName));
        del.sync(path.join(modulePath, 'dist', '_static', args.serveFolder, jsName));
        del.sync(path.join(modulePath, 'dist', 'output', 's', args.serveFolder, jsName));
        del.sync(path.join(appPath, '.temp', appConf.app, moduleConf.module, args.serveFolder, jsName));
      }
    });
  }
}
