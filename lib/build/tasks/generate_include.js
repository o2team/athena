'use strict';

module.exports = function( $, appConf, moduleConf, args ) {
  return function( mod, modulePath, appPath ) {
    return new Promise( function( resolve, reject ) {
      var path = require( 'path' );
      var fs = require( 'fs' );
      var _ = require('lodash');
      var beautifyHtml = require('js-beautify').html;
      var Util = require('../../util');
      var mkdirp = require('mkdirp');

      var useInclude = appConf.useInclude;
      var folder = useInclude.folder ? useInclude.folder : 'include';
      if (useInclude
        && !_.isEmpty(useInclude.files)
        && Util.existsSync(path.join(appPath, '.' + folder + '.json'))) {
          var fileChunk;
          try {
            fileChunk = JSON.parse(String(fs.readFileSync(path.join(appPath, '.' + folder + '.json'))));
          } catch (e) {
            fileChunk = {};
          }
          if (!_.isEmpty(fileChunk)) {
            for (var i in fileChunk) {
              var includeFolder = path.join(appPath, '.temp', appConf.app, folder);
              if (!Util.existsSync(includeFolder)) {
                mkdirp.sync(includeFolder);
              }
              var content = fileChunk[i].content.join('');
              fs.writeFileSync(path.join(includeFolder, i), beautifyHtml(content, { indent_size: 2, max_preserve_newlines: 1 }));
            }
          }
          resolve();
      } else {
        resolve();
      }
    });
  }
}
