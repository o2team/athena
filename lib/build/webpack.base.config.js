const path = require('path')
const webpack = require('webpack')
var Util = require('../util')

module.exports = {
  entry: {},
  output: {},
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
      },
      {
        test: /\.css$/,
        exclude: /(node_modules|bower_components)/,
        use: [
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
  resolve: {
    modules: [path.join(Util.getRootPath(), 'node_modules'), 'node_modules']
  },
  resolveLoader: {
    modules: [path.join(Util.getRootPath(), 'node_modules'), 'node_modules']
  }
}
