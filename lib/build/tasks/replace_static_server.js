/**
* @fileoverview server模式，资源替换
* @author liweitao
*/

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath, remoteName) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs')
      var path = require('path')
      var vfs = require('vinyl-fs')

      var athenaMate = require('../athena_mate')
      var Util = require('../../util')

      var isServe = (args && args.isServe) ? args.isServe : false
      var remoteName = (args && args.remote) ? args.remote : 'local'
      var isRelease = (args && args.release) ? args.release : false

      vfs.src(path.join(modulePath, 'dist', '_static', '**'), { base: path.join(modulePath, 'dist', '_static') })
        .pipe(athenaMate.replaceServer({
          cwd: appPath,
          module: moduleConf.module,
          serve: isServe,
          release: isRelease,
          replaceType: remoteName,
          refModuleList: moduleConf.refModuleList || [],
          base64Opts: moduleConf.support.base64
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static')))
        .on('end', function () {
          resolve()
        })
        .on('error', function (err) {
          reject(err)
        })
    })
  }
}
