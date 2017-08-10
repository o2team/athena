/**
* @fileoverview server模式，serve时js文件处理
* @author  liweitao
*/

'use strict';

var mapJson
module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var athenaMate = require('../athena_mate');
      var del = require('del');
      var _ = require('lodash');
      var through2 = require('through2')

      var Util = require('../../util');

      var useBabel = moduleConf.support.useBabel || { enable: false };
      var enableBabel = useBabel.enable;
      var jsxPragma = useBabel.jsxPragma || 'Nerv.createElement'
      var jsName = path.basename(args.fPath, path.extname(args.fPath)) + '.js';
      var processorConf = moduleConf.support.processor;
      var jsProcessorConf = processorConf ? processorConf.js : {};
      var defaultJsProcessorConf = {};
      jsProcessorConf = _.assign(defaultJsProcessorConf, jsProcessorConf);
      if (!mapJson) {
        mapJson = Util.readJsonFile(path.join(modulePath, 'dist', 'map.json'));
      }
      var commonWidgets = [];
      var widgets = [];
      var dependencyAll = mapJson.dependency;
      for (var i in dependencyAll) {
        if (Util.regexps.tpl.test(i)) {
          dependencyAll[i].forEach(function (widget) {
            var name = widget.widgetName;
            if (widgets.indexOf(name) >= 0) {
              widget.isCommon = true;
              commonWidgets.indexOf(name) < 0 && commonWidgets.push(name);
            }
            widgets.push(name);
          });
        }
      }

      if (args.type === 'changed') {
        vfs.src(args.fPath)
          .pipe(vfs.dest(path.join(modulePath, 'dist', '_', args.serveFolder)))
          .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', args.serveFolder)))
          // .pipe($.if(enableBabel, athenaMate.babel({
          //   config: {
          //     presets: [
          //       require('babel-preset-es2015'),
          //       require('babel-preset-stage-0')
          //     ],
          //     plugins: [
          //       require('babel-plugin-transform-es3-member-expression-literals'),
          //       require('babel-plugin-transform-es3-property-literals'),
          //       [require('babel-plugin-transform-react-jsx'), {
          //         pragma: jsxPragma
          //       }]
          //     ]
          //   },
          //   fileTest: useBabel.test || /\.js/,
          // })))
          // .pipe(athenaMate.processorJS({
          //   type: jsProcessorConf.type,
          //   exclude: jsProcessorConf.exclude,
          //   widgets: widgets,
          //   commonWidgets: commonWidgets,
          //   moduleName: moduleConf['module'],
          //   appName: appConf['app'],
          //   appPath: appPath,
          //   modulePath: modulePath,
          //   isServe: true,
          //   mapJson: mapJson
          // }))
          .pipe(athenaMate.replaceServer({
            cwd: appPath,
            module: moduleConf.module,
            serve: true
          }))
          .pipe(vfs.dest(path.join(modulePath, 'dist', 'output', 's', args.serveFolder)))
          .on('end', function () {
            vfs.src(path.join(modulePath, 'dist', 'output', 's', args.serveFolder, jsName))
              .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module, args.serveFolder)))
              .on('end', function () {
                resolve()
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
