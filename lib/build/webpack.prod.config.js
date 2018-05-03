const path = require('path')
const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const _ = require('lodash')

module.exports = function (libContext, appConf) {
  const definitions = (appConf.webpackConf || {}).definitions || {}
  const definitionsMerged = _.merge({
    'process.env': {
      NODE_ENV: '"production"'
    }
  }, definitions.base||{}, definitions.prod||{})
  // console.log({definitionsMerged})
  return {
    devtool: false,
    module: {
      rules: [
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: ExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: [{
              loader: 'css-loader',
              options: {
                url: false,
                import: false
              }
            }]
          })
        },
        {
          enforce: 'post',
          test: /\.js|jsx$/,
          loader: require.resolve('es3ify-loader')
        }
      ]
    },
    resolve: {
      mainFields: ['main']
    },
    plugins: [
      new webpack.DefinePlugin(definitionsMerged),
      new webpack.DllReferencePlugin({
        context: libContext,
        manifest: require(path.join(libContext, 'manifest.json'))
      }),
      new ExtractTextPlugin({
        filename: '[name].css'
      }),
      new webpack.optimize.UglifyJsPlugin({
        beautify: false,
        mangle: {
          screw_ie8: false,
          keep_fnames: true,
          properties: false,
          keep_quoted: true
        },
        compress: {
          screw_ie8: false,
          properties: false
        },
        output: {
          keep_quoted_props: true
        },
        comments: false
      })
    ]
  }
}
