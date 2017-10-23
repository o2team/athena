module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      const path = require('path')
      const fs = require('fs-extra')
      const webpack = require('webpack')
      const webpackMerge = require('webpack-merge')

      const webpackBaseConfig = require('../webpack.base.config')(appPath, '')
      const webpackDllConfig = require('../webpack.dll.config')(path.join(appPath, appConf.common, 'dist', 'output', 's'))
      const Util = require('../../util')

      const webpackConfig = webpackMerge(webpackBaseConfig, webpackDllConfig)

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
