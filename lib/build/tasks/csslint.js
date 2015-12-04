'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var through2 = require('through2');      
      var csslint = require('csslint').CSSLint;
      var os = require('os');

      //是否开启csslint
      var _csslint = moduleConf.support.csslint;
      var hasErr = false;

      function execCssLint( filename, fileContent ){
        var content = typeof( fileContent ) === 'undefined' ? fs.readFileSync(filename,'utf8') : fileContent;
        var result = csslint.verify( content );
        var shortFileName = filename.replace( modulePath + '/dist/_/', '' );
        if( result && result.messages.length ){
          hasErr = true;
          var n = 0;
          var messagesType = function( type ){
            return type == 'error';
          }
          result.messages.forEach(function( message, i ){
            var type = message.type;
            if( messagesType( type ) ){
              n += 1;
            }
          });

          $.util.log($.util.colors.cyan( 'csslint file: ' + shortFileName ));

          result.messages.forEach(function (message, index){
            var type = message.type;

            if(messagesType(type)){
              $.util.log($.util.colors.red( 'line: '+(index+1) ));
              $.util.log($.util.colors.red('>>'), 'line: ' + message.line + ', column: ' + message.col);
              $.util.log($.util.colors.red('>>'), 'msg: ' + message.message);
              $.util.log($.util.colors.red('>>'), 'at: ' + message.evidence);              
            }
          });
        }        
      }

      if( _csslint && _csslint.enable !== false ){
        $.util.log($.util.colors.green('开始' + mod + '模块任务csslint！'));  
      }
            
      vfs.src([modulePath + '/dist/_/**/*.css', '!' + modulePath + '/dist/_/**/*.min.css'])
        .pipe(through2.obj(function(chunk, enc, done){
          
          if( _csslint && _csslint.enable !== false ){
            execCssLint(chunk.history[0]);
            if( !hasErr ){
              this.push(chunk);    
            }
            done();
          } else {
            this.push(chunk);    
            done();  
          }      
        }))
        .on('finish', function () {     
          if( hasErr ){
            $.util.log($.util.colors.red(mod + '模块任务csslint失败！'));
            reject('');  
          } else {
            $.util.log($.util.colors.green('结束' + mod + '模块任务csslint！'));
            resolve();  
          }
          $.util.log($.util.colors.green('结束' + mod + '模块任务csslint！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务csslint失败！'));
          reject(err);
        });
    

    });
  };

};
