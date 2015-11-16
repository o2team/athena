'use strict';

module.exports = function ( $, appConf, moduleConf, args ) {
  return function ( mod, modulePath, appPath ) {
    return new Promise( function ( resolve, reject ) {
      var athenaMate = require( '../athena_mate' );
      var path = require( 'path' );
      var vfs = require( 'vinyl-fs' );
      var fs = require( 'fs' );
      var Util = require( '../../util' );

      $.util.log( $.util.colors.green( '开始扫描' + mod + '模块所有文件！' ) );

      vfs.src( modulePath + '/!(dist)/' + '/**' )
        .pipe( vfs.dest( modulePath + '/dist/_' ) )
        .pipe( $.if( function ( file ) {
          return /\.scss|\.sass/.test( path.basename( file.path ) );
        }, athenaMate.compass() ) )
        .pipe( $.if(function(file){
          return /\.less/.test(path.basename(file.path));
        }, $.less()))
        .on( 'finish', function () {
          $.util.log( $.util.colors.green( '结束扫描' + mod + '模块！' ) );
          resolve();
        } )
        .on( 'error', function ( err ) {
          $.util.log( $.util.colors.red( '扫描' + mod + '模块居然失败！' ) );
          reject( err );
        } );
    } );
  }
}
