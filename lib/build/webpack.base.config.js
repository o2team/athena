const path = require('path')

const Util = require('../util')

module.exports = function (appPath, modPath) {
  return {
    module: {
      rules: [
        {
          test: /\.js|jsx$/,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: {
                presets: [
                  [require('babel-preset-es2015').buildPreset, {
                    loose: true,
                    spec: true
                  }],
                  require('babel-preset-stage-0')
                ],
                plugins: [
                  require('babel-plugin-transform-es3-member-expression-literals'),
                  require('babel-plugin-transform-es3-property-literals'),
                  require('babel-plugin-transform-remove-strict-mode'),
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
    resolve: {
      modules: [path.join(Util.getRootPath(), 'node_modules'), 'node_modules'],
      alias: {
        '@APP': appPath,
        '@MOD': modPath
      }
    },
    resolveLoader: {
      modules: [path.join(Util.getRootPath(), 'node_modules'), 'node_modules']
    }
  }
}
