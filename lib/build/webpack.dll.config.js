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

module.exports = function (contextPath) {
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
      })
    ]
  }
}
