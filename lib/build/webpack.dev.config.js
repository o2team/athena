const webpack = require('webpack')
const path = require('path')
const _ = require('lodash')

const Util = require('../util')

module.exports = function (appPath, modPath, appConf) {
  const definitions = (appConf.webpackConf || {}).definitions || {}
  const definitionsMerged = _.merge({
    'process.env': {
      NODE_ENV: '"development"'
    }
  }, definitions.base||{}, definitions.dev||{})
  // console.log({definitionsMerged})
  return {
    devtool: 'cheap-module-eval-source-map',
    module: {
      rules: [
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: [
            { loader: 'style-loader' },
            {
              loader: 'css-loader',
              options: {
                url: false,
                import: false
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
      new webpack.DefinePlugin(definitionsMerged)
    ]
  }
}
