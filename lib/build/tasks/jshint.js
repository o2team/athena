/**
* @fileoverview js代码检查
* @author  liweitao@jd.com
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var through2 = require('through2');
      var JSHINT = require('jshint').JSHINT;

      var _jshint = moduleConf.support.jshint;
      var hasErr = false;

      function execJshint( fileName, options ){
        var source = fs.readFileSync(fileName,'utf8');
        var shortFileName = fileName.replace(path.join(modulePath, 'dist', '_'), '');
        var options = options || {
          globalstrict: true,
          globals: {
            "require": false,
            "module": false,
            "console": false,
            "__dirname": false,
            "process": false,
            "exports": false
          }
        }
        //console.log(options)
        JSHINT(source, options);
        var data = JSHINT.data();
        //console.log(data)
        if( data.errors && data.errors.length ){
          hasErr = true;
          $.util.log($.util.colors.cyan('file: ' + shortFileName));
        }
        data.errors && data.errors.forEach(function( message, index ){
            $.util.log($.util.colors.yellow( 'line: '+(index+1) ));
            $.util.log($.util.colors.yellow('>>'), 'line: ' + message.line + ', column: ' + message.character);
            $.util.log($.util.colors.yellow('>>'), 'msg: ' + message.reason);
        })
        //console.log(JSHINT.data());
      }

      if( _jshint && _jshint.enable !== false ){
        $.util.log($.util.colors.green('开始' + mod + '模块任务jshint！'));
        vfs.src(path.join(modulePath, 'dist', '_', '**', '*.js'))
          .pipe(through2.obj(function(chunk, enc, done){
            execJshint(chunk.history[0]);
            if( !hasErr ){
              this.push(chunk);
            }
            done();
          }))
          .on('finish', function (message) {
            if( hasErr ){
              $.util.log($.util.colors.red(mod + '模块任务jshint失败！'));
              reject('');
            } else {
              $.util.log($.util.colors.green('结束' + mod + '模块任务jshint！'));
              resolve();
            }
          })
          .on('error', function (err) {
            $.util.log($.util.colors.red(mod + '模块任务jshint失败！'));
            reject(err);
          });
      } else {
        resolve();
      }
    });
  }
}
