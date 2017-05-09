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
      var through2 = require('through2');
      var glob = require('glob');

      var Util = require('../../util');
      $.util.log($.util.colors.green('开始' + mod + '模块任务处理JS文件！'));
      var isServe = !!args.isServe
      var processorConf = moduleConf.support.processor;
      var jsProcessorConf = processorConf ? processorConf.js : {};
      var defaultJsProcessorConf = {
        
      };
      jsProcessorConf = _.assign(defaultJsProcessorConf, jsProcessorConf);

      vfs.src([path.join(modulePath, 'dist', '_static', '{page,widget}', '**', '*.js'), path.join('!' + modulePath, 'dist', '_static', '{page,widget}', '**', '*.min.js')])
        .pipe(through2.obj(function (file, enc, cb) {
          if (file.isNull() || file.isStream()) {
            return cb(null, file)
          }
          if (jsProcessorConf.type === 'nerv') {
            var fpath = file.path
            var fileInnerPath = fpath.replace(path.join(modulePath, 'dist', '_static', '/'), '')
            var fileInnerFirstDir = fileInnerPath.split(path.sep)[0]
            var filename = path.basename(file.path, path.extname(file.path))
            var dirname = path.dirname(file.path)
            var content = file.contents.toString()
            var fileClassName = _.camelCase(filename)
            fileClassName = _.upperFirst(fileClassName)
            var cssSuffix = isServe ? '.css' : '.min.css'
            var sameNameCssFile = fpath.replace(path.extname(fpath), cssSuffix)
            var hasSameNameCssFile = Util.existsSync(sameNameCssFile)
            if (hasSameNameCssFile) {
              var cssContent = '';
              var widgetCSSGlob = glob.sync(path.join(dirname, '*' + cssSuffix))
              widgetCSSGlob.forEach(function (item) {
                cssContent += String(fs.readFileSync(item))
              })
              cssContent = Util.processCss(cssContent, function (value) {
                return '__uri(' + value + ')'
              })
              var version = Util.checksum(new Buffer(content + cssContent), 16)
              var styleStr = fileClassName + '.styleText = ' + JSON.stringify(cssContent)
              var versionStr = fileClassName + '.version = \'' + version + '\''
              content += '\n' + styleStr + '\n' + versionStr
            }
            var fileJSPreffix = 'Nerv.Module.define(\'' + moduleConf['module'] + '/' + fileInnerFirstDir + '/' + filename + '\', function (require, exports, module) {'
            if (fileInnerFirstDir === 'page') {
              fileJSPreffix = 'Nerv.Module.use(function () {'
            }
            var fileJSSuffix = '})'
            content = fileJSPreffix + '\n' + content + '\n' + fileJSSuffix
            file.contents = new Buffer(content)
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
