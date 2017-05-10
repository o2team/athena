/**
* @fileoverview js文件处理
* @author  liweitao
*/

'use strict';

var vfs = require('vinyl-fs');
var fs = require('fs')
var path = require('path');
var _ = require('lodash');
var through2 = require('through2');
var glob = require('glob');

var Util = require('../../util');

module.exports = function (opts) {
  return through2.obj(function (file, enc, cb) {
    if (file.isNull() || file.isStream()) {
      return cb(null, file)
    }
    if (opts.type === 'nerv') {
      var fpath = file.path
      var fileInnerPath = fpath.replace(path.join(opts.modulePath, 'dist', '_static', '/'), '')
      var fileInnerFirstDir = fileInnerPath.split(path.sep)[0]
      var filename = path.basename(file.path, path.extname(file.path))
      var dirname = path.dirname(file.path)
      var content = file.contents.toString()
      var fileClassName = _.camelCase(filename)
      fileClassName = _.upperFirst(fileClassName)
      var cssSuffix = opts.isServe ? '.css' : '.min.css'
      var sameNameCssFile = fpath.replace(path.extname(fpath), cssSuffix)
      var hasSameNameCssFile = Util.existsSync(sameNameCssFile)
      if (hasSameNameCssFile && opts.widgets.indexOf(filename) < 0) {
        var cssContent = '';
        var cssGlob = glob.sync(path.join(dirname, '*' + cssSuffix))
        cssGlob.forEach(function (item) {
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
      var fileJSPreffix = 'Nerv.Module.define(\'' + opts.moduleName + '/' + fileInnerFirstDir + '/' + filename + '\', function (require, exports, module) {'
      if (fileInnerFirstDir === 'page') {
        fileJSPreffix = 'Nerv.Module.use(function () {'
      }
      var fileJSSuffix = '})'
      content = fileJSPreffix + '\n' + content + '\n' + fileJSSuffix
      file.contents = new Buffer(content)
    }
    this.push(file)
    cb()
  })
}
