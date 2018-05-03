const path = require('path')
const webpack = require('webpack')

const vendors = [
  'es6-object-assign',
  'es6-promise',
  'jsonp-retry',
  'nervjs',
  'redux',
  'nerv-redux',
  'redux-thunk'
]

module.exports = function (contextPath, appConf) {
  return {
    entry: {
      vendor: vendors
    },
    module: {
      rules: [
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
    output: {
      path: contextPath,
      filename: '[name].js',
      library: '[name]_library'
    },
    plugins: [
      new webpack.DllPlugin({
        path: path.join(contextPath, 'manifest.json'),
        name: '[name]_library',
        context: contextPath
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
