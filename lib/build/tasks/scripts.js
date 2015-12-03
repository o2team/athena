'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var through2 = require('through2');
      var LintStream = require('jslint').LintStream;
      var options = {
        edition: 'latest',
        length: 10
      };

      var _jslint = moduleConf.support.jslint;
      
      function execJslint( fileName,fileContent ){
        var hasErr = false;
        var l = new LintStream(options);  
        l.write({
          file: fileName,
          body: fileContent
        });
        l.on('data', function( chunk, enc, callback ){
          if (!chunk.linted.ok) {
            $.util.log($.util.colors.yellow( 'jslint: '+ chunk.file ));
            hasErr = true;
          };
          chunk.linted.errors.forEach(function (message, index){
            $.util.log($.util.colors.yellow( 'line: '+(index+1) ));
            $.util.log($.util.colors.yellow('>>'), 'line: ' + message.line + ', column: ' + message.column);
            $.util.log($.util.colors.yellow('>>'), 'msg: ' + message.message);
          });
          
        });
        return hasErr;
        
      }

      $.util.log($.util.colors.green('开始' + mod + '模块任务scripts！'));
      vfs.src([modulePath + '/dist/_static/js/*.js', '!' + modulePath + '/dist/_static/js/*.min.js'])
        .pipe(vfs.dest(modulePath + '/dist/_static/js'))
        .pipe(through2.obj(function(chunk, enc, done){
          
          if( _jslint && _jslint.enable !== false ){
            var hasErr = execJslint(chunk.history[0],fs.readFileSync(chunk.history[0],'utf8'));
            if( !hasErr ){
              this.push(chunk);    
            }
            done();  
          } else {
            this.push(chunk);    
            done();  
          }          
        }))
        .pipe(vfs.dest(modulePath + '/dist/_static/js'))
        .pipe($.uglify())
        .pipe($.rename(function (path) {
          path.basename += '.min';
        }))
        .pipe(vfs.dest(modulePath + '/dist/_static/js'))
        .on('end', function () {
          $.util.log($.util.colors.green('结束' + mod + '模块任务scripts！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务scripts失败！'));
          reject(err);
        });
    });
  }
}
