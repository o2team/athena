'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var athenaMate = require('../athena_mate');
      var Util = require( '../../util' );
      var autoprefixer = require('autoprefixer');
      var processors = [
        autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1']}),
      ];

      
    });
  }
}
