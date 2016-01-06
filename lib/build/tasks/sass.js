'use strict';

module.exports = function( $, appConf, moduleConf, args ) {
  return function( mod, modulePath, appPath ) {
    return new Promise( function( resolve, reject ) {
      var path = require( 'path' );
      var vfs = require( 'vinyl-fs' );
      var athenaMate = require( '../athena_mate' );
      var Util = require( '../../util' );
      var mkdirp = require('mkdirp');

      var sasslib = [];
      var gCssDirPath = path.join(appPath, appConf.common, 'static','css');
      var gSassDirPath = path.join(appPath, appConf.common, 'static','sass');
      var mCssDirPath = path.join(modulePath, 'static', 'css');
      var mSassDirPath = path.join(modulePath, 'static', 'sass');
      sasslib.push(gCssDirPath);
      sasslib.push(mCssDirPath);
      if (Util.existsSync(gSassDirPath)) {
        sasslib.push(gSassDirPath);
      }
      if (Util.existsSync(mSassDirPath)) {
        sasslib.push(mSassDirPath);
      }
      vfs.src( [ path.join(modulePath, 'dist', '_', '**', '*.scss'), path.join(modulePath, 'dist', '_', '**', '*.sass') ] )
        .on( 'finish', function() {
          $.util.log( $.util.colors.green( '开始' + mod + '模块任务的sass' ) );
        } )
        .pipe( athenaMate.compass({
          cwd: appPath,
          imagePath: path.join(modulePath, 'static', 'images'),
          sasslib : sasslib //全局sass文件 在全局目录的static目录下
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
