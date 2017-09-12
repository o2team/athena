const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

module.exports = function () {
  return {
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
        }
      ]
    },
    plugins: [
      new ExtractTextPlugin({
        filename: 'page/[name]/[name].min.css'
      }),
      new webpack.optimize.UglifyJsPlugin({
        beautify: false,
        mangle: {
          screw_ie8: true,
          keep_fnames: true,
          properties: false
        },
        compress: {
          screw_ie8: true,
          properties: false
        },
        comments: false
      })
    ]
  }
}
