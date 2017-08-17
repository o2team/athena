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
    }
  }
}
