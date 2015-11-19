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

      return vfs.src( modulePath + '/!(dist)/' + '/**' )
        .pipe( vfs.dest( modulePath + '/dist/_' ))
        .on('finish',function(){
          $.util.log( $.util.colors.yellow( '正在扫描' + mod + '模块！' ) );
          var sassPromise = new Promise(function(resolve,reject){
            vfs.src( [modulePath + '/dist/_' + '/**.scss',modulePath + '/dist/_' + '/**.sass' ])
            .pipe( athenaMate.compass() )
            .on('finish',function(){
              $.util.log( $.util.colors.green( '正在编译' + mod + '模块的sass文件' ) );
              resolve();
            })
            .on( 'error', function ( err ) {
              $.util.log( $.util.colors.red( '编译' + mod + '模块的sass文件失败！' ) );
              reject( err );
            } );
          });

          var lessPromise = new Promise(function(resolve,reject){
            vfs.src( modulePath + '/dist/_' + '/**.less')
            .pipe( $.less() )
            .on('finish',function(){
              $.util.log( $.util.colors.green( '正在编译' + mod + '模块的less文件' ) );
              resolve();
            })
            .on( 'error', function ( err ) {
              $.util.log( $.util.colors.red( '编译' + mod + '模块的less文件失败！' ) );
              reject( err );
            } );
          });

          Promise.all([sassPromise,lessPromise])
            .then(function(){
              resolve();
            });

        });

    } );
  }
}
