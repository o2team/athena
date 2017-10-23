const webpack = require('webpack')
const path = require('path')

const Util = require('../util')

module.exports = function (appPath, modPath) {
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
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: '"development"'
        }
      })
    ]
  }
}
