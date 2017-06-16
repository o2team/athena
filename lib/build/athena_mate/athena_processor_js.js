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

function trackFilePath (fpath, depPath, opts) {
  var depFilePath = ''
  if (depPath.indexOf('APP_ROOT') >= 0) {
    depFilePath = depPath.replace('APP_ROOT', '')
    depFilePath = path.join(opts.appPath, depFilePath)
  } else if (depPath.indexOf('MOD_ROOT') >= 0) {
    depFilePath = depPath.replace('MOD_ROOT', '')
    depFilePath = path.join(opts.modulePath, depFilePath)
  } else if (depPath.indexOf('WIDGET') >= 0) {
    depFilePath = depPath.replace('WIDGET', '')
    depFilePath = path.join(opts.modulePath, 'widget', depFilePath)
  } else if (depPath.indexOf('STATIC') >= 0) {
    depFilePath = depPath.replace('STATIC', '')
    depFilePath = path.join(opts.modulePath, 'static', depFilePath)
  } else if (depPath[0] === '.' || depPath[0] === '/') {
    if (fpath.indexOf('dist') >= 0) {
      fpath = fpath.replace(path.join('dist', '_static'), '')
    }
    depFilePath = path.resolve(fpath, '..', depPath)
  }
  var extname = path.extname(depFilePath)
  if (!extname) {
    depFilePath += '.js'
  }
  return depFilePath
}

function transfromSyncDep (fpath, dep, regexp, line, needDelete, opts) {
  var depPath = dep['path']
  var arg = dep['variable']
  var depFilePath = ''
  if (Util.regexps.url.test(depPath)) {
    depFilePath = depPath
    var extname = path.extname(depFilePath)
    if (!extname) {
      depFilePath += '.js'
    }
    line = line.replace(regexp, function (m, $1) {
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
  depFilePath = trackFilePath(fpath, depPath, opts)
  if (Util.existsSync(depFilePath)) {
    var depFilePathInner = depFilePath.replace(path.join(opts.appPath, '/'), '')
    var depFilePathInnerArr = depFilePathInner.split(path.sep)
    var depFilePathInnerArrLen = depFilePathInnerArr.length
    var depModuleName = depFilePathInnerArr[0]
    var depDirName = depFilePathInnerArr[1]
    var depName = path.basename(depFilePathInnerArr[depFilePathInnerArrLen - 1], path.extname(depFilePath))
    var realDep = depModuleName + '/' + depDirName + '/' + depName
    // 替换掉当前依赖
    line = line.replace(regexp, function (m, $1) {
      if (needDelete) {
        return ''
      }
      return 'var ' + arg + ' = require(\'' + realDep + '\');'
    })
    depFilePathInnerArr.splice(0, 1)
    return {
      arg: arg,
      filePath: depFilePathInnerArr.join('/'),
      dep: realDep,
      line: line
    }
  } else {
    throw new Error('文件' + fpath + '中依赖' + depPath + '不存在，请检查！')
  }
}

function transfromLazyDep (fpath, dep, regexp, line, opts) {
  var depPath = dep['path'] || ''
  var arg = dep['variable'] || ''
  depPath = depPath.replace(/\'|\"|\s/g, '')
  arg = arg.replace(/\'|\"|\s/g, '')
  var depPathArr = depPath.split(',')
  var argArr = arg.split(',')
  var depList = []
  var newDepPath = ''
  depPathArr.forEach(function (item, index) {
    var depFilePath
    if (Util.regexps.url.test(item)) {
      depFilePath = item
      var extname = path.extname(depFilePath)
      if (!extname) {
        depFilePath += '.js'
      }
      newDepPath += '\'' + depFilePath + '\''
      depList.push({
        arg: argArr[index],
        filePath: depFilePath,
        dep: depFilePath
      })
    } else {
      depFilePath = trackFilePath(fpath, item, opts)
      if (Util.existsSync(depFilePath)) {
        var depFilePathInner = depFilePath.replace(path.join(opts.appPath, '/'), '')
        var depFilePathInnerArr = depFilePathInner.split(path.sep)
        var depModuleName = depFilePathInnerArr[0]
        var depDirName = depFilePathInnerArr[1]
        var depName = path.basename(depFilePathInnerArr[depFilePathInnerArrLen - 1], path.extname(depFilePath))
        var realDep = depModuleName + '/' + depDirName + '/' + depName
        newDepPath += '\'' + realDep + '\''
        depFilePathInnerArr.splice(0, 1)
        depList.push({
          arg: argArr[index],
          filePath: depFilePathInnerArr.join('/'),
          dep: realDep
        })
      } else {
        throw new Error('文件' + fpath + '中依赖' + depPath + '不存在，请检查！')
      }
    }
    if (index < depPathArr.length - 1) {
      newDepPath += ' ,'
    }
  })
  newDepPath = '[' + newDepPath + ']'
  // 替换掉当前依赖
  line = line.replace(regexp, function (m, $1) {
    return 'require.async(' + newDepPath + ', function (' + dep['variable'] + ')'
  })
  return {
    line: line,
    depList: depList
  }
}

function addJsDepsToMapJson (filename, mapJson, deps) {
  mapJson['jsDeps'] = mapJson['jsDeps'] || {}
  mapJson['jsDeps'][filename] = mapJson['jsDeps'][filename] || {}
  if (mapJson['jsDeps'][filename]['sync']) {
    mapJson['jsDeps'][filename]['sync'] = mapJson['jsDeps'][filename]['sync'].concat(deps['sync'])
  } else {
    mapJson['jsDeps'][filename]['sync'] = deps['sync']
  }
  if (mapJson['jsDeps'][filename]['async']) {
    mapJson['jsDeps'][filename]['async'] = mapJson['jsDeps'][filename]['async'].concat(deps['async'])
  } else {
    mapJson['jsDeps'][filename]['async'] = deps['async']
  }
}

module.exports = function (opts) {
  var files = []
  return through2.obj(function (file, enc, cb) {
    if (file.isNull() || file.isStream()) {
      return cb(null, file)
    }
    var fpath = file.path
    var exclude = opts.exclude || []
    var isExcluded = false
    exclude.forEach(function (item) {
      if (fpath.indexOf(path.join(item)) >= 0) {
        isExcluded = true
      }
    })
    if (isExcluded) {
      files.push({
        isPage: false,
        file: file
      })
      cb()
      return
    }
    if (opts.type === 'nerv') {
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
      var lazyAsyncDeps = [] // 通过require.async方式延迟加载的异步依赖
      var isPage = fileInnerFirstDir === 'page'
      content = trackJsDepAndModify(content, function (type, line, dep) {
        if (type === 'sync' && dep) {
          var transfromDepRes = transfromSyncDep(fpath, dep, Util.regexps.require, line, isPage, opts)
          var lineRes = transfromDepRes.line
          delete transfromDepRes.line
          syncDeps.push(transfromDepRes)
          return lineRes
        } else if (type === 'lazy' && dep) {
          var transfromDepRes = transfromLazyDep(fpath, dep, Util.regexps.requireAsync, line, opts)
          var lineRes = transfromDepRes.line
          delete transfromDepRes.line
          lazyAsyncDeps = lazyAsyncDeps.concat(transfromDepRes.depList)
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
      // 检查文件内容是否为空
      var isFileEmpty = false
      var contentCopy = content.replace(Util.regexps.useStrict, '').replace(/[\r\n]|[ ]/g, '')
      if (_.isEmpty(contentCopy)) {
        isFileEmpty = true
      }
      if (hasSameNameCssFile && opts.widgets.indexOf(filename) < 0 && opts.commonWidgets.indexOf(filename) < 0 && !isFileEmpty) {
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
      if (!isFileEmpty) {
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
      }
      file.contents = new Buffer(content)
      addJsDepsToMapJson(fileInnerPath, opts.mapJson, {
        sync: syncDeps,
        async: lazyAsyncDeps.concat(asyncDeps)
      })
    }
    files.push({
      isPage: isPage,
      file: file
    })
    cb()
  }, function (cb) {
    var jsDeps = opts.mapJson.jsDeps
    if (jsDeps) {
      var asyncDeps = []
      var asyncDepJson = {}
      for (var key in jsDeps) {
        var jsDepItem = jsDeps[key]
        if (jsDepItem.async.length) {
          jsDepItem.async.forEach(function (item) {
            var hasExist = false
            asyncDeps.forEach(function (aItem) {
              if (aItem.dep === item.dep) {
                hasExist = true
              }
            })
            if (!hasExist) {
              asyncDeps.push(item)
            }
          })
        }
      }
      asyncDeps.forEach(function (item) {
        if (!Util.regexps.url.test(item['filePath'])) {
          asyncDepJson[item['dep']] = '__hash(' + item['filePath'] + ')'
        }
      })
      fs.writeFileSync(path.join(opts.modulePath, 'dist', 'map.json'), JSON.stringify(opts.mapJson, null, 2))
      opts.mapJson.asyncDepJson = asyncDepJson
    }
    files.forEach(function (item) {
      this.push(item.file)
    }.bind(this))
    cb()
  })
}
