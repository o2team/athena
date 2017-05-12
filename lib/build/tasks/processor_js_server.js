/**
* @fileoverview server模式专用，JS代码处理
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var fs = require('fs')
      var path = require('path');
      var _ = require('lodash');
      var through2 = require('through2')

      var Util = require('../../util');
      var athenaMate = require('../athena_mate');

      $.util.log($.util.colors.green('开始' + mod + '模块任务处理JS文件！'));
      var isServe = !!args.isServe
      var processorConf = moduleConf.support.processor;
      var jsProcessorConf = processorConf ? processorConf.js : {};
      var defaultJsProcessorConf = {}
      jsProcessorConf = _.assign(defaultJsProcessorConf, jsProcessorConf);

      var mapJson = Util.readJsonFile(path.join(modulePath, 'dist', 'map.json'));
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

      vfs.src([path.join(modulePath, 'dist', '_static', '{page,widget}', '**', '*.js'), path.join('!' + modulePath, 'dist', '_static', '{page,widget}', '**', '*.min.js')])
        .pipe(athenaMate.processorJS({
          type: jsProcessorConf.type,
          widgets: widgets,
          commonWidgets: commonWidgets,
          moduleName: moduleConf['module'],
          appName: appConf['app'],
          appPath: appPath,
          modulePath: modulePath,
          isServe: isServe,
          mapJson: mapJson
        }))
        .pipe(through2.obj(function (file, enc, cb) {
          if (file.isNull() || file.isStream()) {
            return cb(null, file)
          }
          var fpath = file.path
          var fileInnerPath = fpath.replace(path.join(modulePath, 'dist', '_static', '/'), '')
          if (fileInnerPath.indexOf('page') === 0) {
            var contents = file.contents
            file.contents = new Buffer('var ASYNC_HASH_MAP = ' + JSON.stringify(mapJson.asyncDepJson) + ';\n' + String(contents))
          }
          this.push(file)
          cb()
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')))
        .on('finish', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务处理JS文件！'));
          resolve();
        }).on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务处理JS文件失败！'));
          reject(err);
        });
    });
  };
};
