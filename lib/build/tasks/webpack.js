/**
* @fileoverview webpack打包处理
* @author  liweitao
*/

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      const path = require('path')
      const fs = require('fs-extra')
      const webpack = require('webpack')
      const webpackMerge = require('webpack-merge')

      const webpackBaseConfig = require('../webpack.base.config')(appPath, modulePath)
      const webpackProdConfig = require('../webpack.prod.config')()

      const Util = require('../../util')
      const common = moduleConf.common
      const refModuleList = moduleConf.refModuleList || []
      refModuleList.push(mod)
      refModuleList.push(common)
      const moduleOutputPath = path.join(modulePath, 'dist', 'output')
      const moduleStaticPath = path.join(modulePath, 'dist', '_static')
      const readOutputTpl = fs.readdirSync(path.join(moduleOutputPath, 'tpl'))
      const allPages = []
      let entry = {}
      readOutputTpl.forEach(function (item) {
        if (Util.regexps.tpl.test(path.extname(item))) {
          allPages.push(item)
        }
      })
      allPages.forEach(function (item) {
        const pageName = path.basename(item, path.extname(item))
        const jsPath = path.join(moduleStaticPath, 'page', pageName, pageName + '.js')
        entry[pageName] = [
          jsPath
        ]
      })
      const webpackConfig = webpackMerge(webpackBaseConfig, webpackProdConfig, {
        entry: entry,
        output: {
          path: moduleStaticPath,
          filename: 'page/[name]/[name].min.js',
          chunkFilename: '[name].chunk.min.js'
        },
        resolve: {
          alias: (function () {
            const aliasObj = {}
            refModuleList.forEach(function (item) {
              aliasObj[`@${item}`] = path.join(appPath, item, 'dist', 'output', 's')
            })
            return aliasObj
          })()
        }
      })

      webpack(webpackConfig, function (err, stats) {
        if (err) {
          throw err
        }
        const info = stats.toJson()
        if (stats.hasErrors()) {
          throw new Error(info.errors)
        }
        console.log(stats.toString({
          colors: true
        }))
        resolve()
      })
    })
  }
}
