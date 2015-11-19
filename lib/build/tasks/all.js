'use strict';

module.exports = function( $, appConf, moduleConf, args ) {
  return function( mod, modulePath, appPath ) {
    return new Promise( function( resolve, reject ) {
      var athenaMate = require( '../athena_mate' );
      var path = require( 'path' );
      var vfs = require( 'vinyl-fs' );
      var fs = require( 'fs' );
      var Util = require( '../../util' );

      $.util.log( $.util.colors.green( '开始扫描' + mod + '模块所有文件！' ) );

      return vfs.src( modulePath + '/!(dist)/' + '/**' )
        .pipe( vfs.dest( modulePath + '/dist/_' ) )
        .on( 'finish', function() {
          resolve();
        } );

    } );
  }
}
