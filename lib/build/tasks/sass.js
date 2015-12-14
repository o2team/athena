'use strict';

module.exports = function( $, appConf, moduleConf, args ) {
  return function( mod, modulePath, appPath ) {
    return new Promise( function( resolve, reject ) {
      var path = require( 'path' );
      var vfs = require( 'vinyl-fs' );
      var athenaMate = require( '../athena_mate' );
      vfs.src( [ modulePath + '/dist/_/**/' + '*.scss', modulePath + '/dist/_/**/' + '*.sass' ] )
        .on( 'finish', function() {
          $.util.log( $.util.colors.green( '开始' + mod + '模块任务的sass' ) );
        } )
        .pipe( athenaMate.compass({
          cwd: appPath,
          sasslib : [path.join(appPath, appConf.common, 'static','sass'), path.join(modulePath, 'static', 'sass')]  //全局sass文件 在全局目录的static目录下
        }) )
        .on( 'finish', function() {
          $.util.log( $.util.colors.green( '完成' + mod + '模块任务的sass' ) );
          resolve();
        } )
        .on( 'error', function( err ) {
          $.util.log( $.util.colors.red( mod + '模块的sass文件失败！' ) );
          reject( err );
        } )
        .pipe( $.util.noop() );
    } );
  }
}
