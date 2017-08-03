/**
* @fileoverview webpack打包处理
* @author  liweitao
*/

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath, remoteName) {
    return new Promise(function (resolve, reject) {
      const fs = require('fs-extra')
      const path = require('path')
      const webpack = require('webpack')
      var gutil = require('gulp-util')
      var Util = require('../../util')

      const webpackCustomConf = appConf.webpack || { enable: false }
      if (!webpackCustomConf.enable) {
        return resolve()
      }
      const readOutput = fs.readdirSync(path.join(modulePath, 'dist', 'output', 'tpl'))
      let allPages = []
      readOutput.forEach(function (item) {
        if (Util.regexps.tpl.test(path.extname(item))) {
          allPages.push(item)
        }
      })
      let entry = {}
      const allJs = allPages.map(function (item) {
        const pageName = path.basename(item, path.extname(item))
        const jsPath = path.join(modulePath, 'dist', '_static', 'page', pageName, pageName + '.js')
        entry[pageName] = jsPath
        return jsPath
      })
      const defaultWebpackConf = {
        entry: entry,
        output: {
          path: path.join(modulePath, 'dist', '_static'),
          filename: 'page/[name]/[name].js',
          chunkFilename: 'chunk/[name].bundle.js'
        },
        module: {
          rules: [
            {
              test: /\.js|jsx$/,
              exclude: /(node_modules|bower_components)/,
              use: [
                {
                  loader: 'babel-loader',
                  options: {
                    presets: [
                      require('babel-preset-es2015'),
                      require('babel-preset-stage-0')
                    ],
                    plugins: [
                      require('babel-plugin-transform-es3-member-expression-literals'),
                      require('babel-plugin-transform-es3-property-literals'),
                      [require('babel-plugin-transform-react-jsx'), {
                        pragma: 'Nerv.createElement'
                      }]
                    ]
                  }
                }
              ]
            }
          ]
        },
        plugins: [
          new webpack.LoaderOptionsPlugin({
            debug: true
          })
        ],
        resolve: {
          modules: [path.join(Util.getRootPath(), 'node_modules'), 'node_modules']
        },
        resolveLoader: {
          modules: [path.join(Util.getRootPath(), 'node_modules'), 'node_modules']
        }
      }
      webpack(defaultWebpackConf, function(err, stats) {
        if(err) throw new gutil.PluginError('webpack', err)
        gutil.log('[webpack]', stats.toString())
        resolve()
      })
    })
  }
}
