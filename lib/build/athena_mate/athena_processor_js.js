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
var trackJsDepAndModify = require('../../util/track_js_dep').trackJsDepAndModify

function isNpmPackage (path) {
  return path[0] !== '.' && path[0] !== '/'
}

function transfromDep (dep, regexp, line, needDelete, opts) {
  var depPath = dep['path']
  var arg = dep['variable']
  var depFilePath = ''
  if (Util.regexps.url.test(depPath)) {
    depFilePath = depPath
    var extname = path.extname(depFilePath)
    if (!extname) {
      depFilePath += '.js'
    }
    line = line.replace(new RegExp(regexp, 'g'), function (m, $1) {
      if (needDelete) {
        return ''
      }
      return 'var ' + arg + ' = require(\'' + depFilePath + '\');'
    })
    return {
      arg: arg,
      filePath: depFilePath,
      dep: depFilePath,
      line: line
    }
  }
  if (depPath.indexOf('APP_ROOT') >= 0) {
    depFilePath = depPath.replace('APP_ROOT', '')
    depFilePath = path.join(opts.appPath, depFilePath)
  } else if (depPath.indexOf('MOD_ROOT') >= 0) {
    depFilePath = depPath.replace('MOD_ROOT', '')
    depFilePath = path.join(opts.modulePath, depFilePath)
  }
  var extname = path.extname(depFilePath)
  if (!extname) {
    depFilePath += '.js'
  }
  if (Util.existsSync(depFilePath)) {
    var depFilePathInner = depFilePath.replace(path.join(opts.appPath, '/'), '')
    var depFilePathInnerArr = depFilePathInner.split(path.sep)
    var depModuleName = depFilePathInnerArr[0]
    var depDirName = depFilePathInnerArr[1]
    var depName = depFilePathInnerArr[2]
    var realDep = depModuleName + '/' + depDirName + '/' + depName
    // 替换掉当前依赖
    line = line.replace(new RegExp(regexp, 'g'), function (m, $1) {
      if (needDelete) {
        return ''
      }
      return 'var ' + arg + ' = require(\'' + realDep + '\');'
    })
    return {
      arg: arg,
      filePath: depFilePath,
      dep: realDep,
      line: line
    }
  } else {
    throw new Error('文件' + fpath + '中依赖' + depPath + '不存在，请检查！')
  }
}

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
      // 跟踪JS文件依赖
      var syncDeps = []
      var asyncDeps = []
      var needDelete = fileInnerFirstDir === 'page'
      content = trackJsDepAndModify(content, function (type, line, dep) {
        if (type === 'sync' && dep) {
          var transfromDepRes = transfromDep(dep, Util.regexps.require, line, needDelete, opts)
          var lineRes = transfromDepRes.line
          delete transfromDepRes.line
          syncDeps.push(transfromDepRes)
          return lineRes
        } else if (type === 'async' && dep) {
          var transfromDepRes = transfromDep(dep, Util.regexps.requireAsync, line, needDelete, opts)
          var lineRes = transfromDepRes.line
          delete transfromDepRes.line
          asyncDeps.push(transfromDepRes)
          return lineRes
        }
      })
      // 处理一下同步依赖，其中可能存在异步依赖
      syncDeps = syncDeps.map(function (dep) {
        var realDep = dep.dep
        if (Util.regexps.url.test(realDep)) {
          asyncDeps.push(dep)
          return
        }
        var realDepArr = realDep.split('/')
        var depModuleName = realDepArr[0]
        var depDirName = realDepArr[1]
        var depName = realDepArr[2]
        if (depDirName === 'widget') {
          if (depModuleName === opts.moduleName && opts.widgets.indexOf(depName) < 0) {
            asyncDeps.push(dep)
            return
          }
          if (opts.commonWidgets.indexOf(depName) < 0) {
            asyncDeps.push(dep)
            return
          }
        }
        return dep
      }).filter(function (dep) {
        return dep
      })

      if (hasSameNameCssFile && opts.widgets.indexOf(filename) < 0 && opts.commonWidgets.indexOf(filename) < 0) {
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
      var asyncDepStr = ''
      if (asyncDeps.length) {
        asyncDepStr = '['
        asyncDeps.forEach(function (dep, index) {
          asyncDepStr += '\'' + dep.dep + '\''
          if (index < asyncDeps.length - 1) {
            asyncDepStr += ','
          }
        })
        asyncDepStr += '], '
      }
      var fileJSPreffix = 'Nerv.Module.define(\'' + opts.moduleName + '/' + fileInnerFirstDir + '/' + filename + '\',' + asyncDepStr + ' function (require, exports, module) {'
      if (fileInnerFirstDir === 'page') {
        var depStr = ''
        var argsStr = ''
        var allDeps = syncDeps.concat(asyncDeps)
        if (allDeps.length) {
          depStr = '['
          allDeps.forEach(function (dep, index) {
            depStr += '\'' + dep.dep + '\''
            argsStr += dep.arg
            if (index < allDeps.length - 1) {
              depStr += ','
              argsStr += ','
            }
          })
          depStr += '], '
        }
        fileJSPreffix = 'Nerv.Module.use(' + depStr + 'function (' + argsStr + ') {'
      }
      var fileJSSuffix = '})'
      content = fileJSPreffix + '\n' + content + '\n' + fileJSSuffix
      file.contents = new Buffer(content)
    }
    this.push(file)
    cb()
  })
}
