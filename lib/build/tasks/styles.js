'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var autoprefixer = require('autoprefixer');
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var through2 = require('through2');
      var sprites = require('postcss-athena-spritesmith'); 
      var pxtorem = require('postcss-pxtorem');
      var csslint = require('csslint').CSSLint;
      var os = require('os');

      //是否开启px转rem
      var px2rem = moduleConf.support.px2rem;
      //是否开启雪碧图合并
      var csssprite = moduleConf.support.csssprite;
      //是否开启csslint
      var _csslint = moduleConf.support.csslint;

      function execCssLint( filename, fileContent ){
        var content = typeof( fileContent ) === 'undefined' ? readFile(filename) : fileContent;
        var result = csslint.verify( content );
        if( result && result.messages.length ){
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

          console.log( os.EOL + 'csslint: ' + filename );

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
        return result && result.messages.length;
      }
      function readFile( path, encoding ){
        encoding = encoding || 'utf8';
        if( !path ){
          return;
        } 
        try{
          return fs.readFileSync( path, encoding );
        }catch( e ){
          console.log('err: ' + e );
        }
      }

      var processors = [
        autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1']}),
      ];
      
      if( px2rem && px2rem.enable !== false ){
        processors.push(pxtorem({
          root_value: px2rem.root_value,
          unit_precision: px2rem.unit_precision,
          prop_white_list: px2rem.prop_white_list,
          selector_black_list: px2rem.selector_black_list,
          replace: px2rem.replace,
          media_query: px2rem.media_query
        }))
      }   
      
      if( csssprite && csssprite.enable !== false ){
        var opts = {
          stylesheetPath: modulePath + '/dist/_static/css/',
          spritePath: modulePath + '/dist/_static/images/sprite.png',
          retina: csssprite.retina || false,
          rootvalue: csssprite.rootvalue
        }        
      }
      
      $.util.log($.util.colors.green('开始' + mod + '模块任务styles！'));

      vfs.src([modulePath + '/dist/_static/css/*.css', '!' + modulePath + '/dist/_static/css/*.min.css'])
        .pipe(through2.obj(function(chunk, enc, done){
          
          if( _csslint && _csslint.enable !== false ){
            var isNotPass = execCssLint(chunk.history[0]);
            if( !isNotPass ){
              this.push(chunk);    
            }
            done();  
          } else {
            this.push(chunk);    
            done();  
          }      
        }))
        .pipe(vfs.dest(modulePath + '/dist/_static/css'))  
        .pipe($.postcss(processors))
        .pipe(vfs.dest(modulePath + '/dist/_static/css'))  
        .pipe(
          $.postcss([
            sprites(opts)
          ])
        )
        .pipe(vfs.dest(modulePath + '/dist/_static/css'))
          
        .pipe($.csso())
        .pipe($.rename(function (path) {
          path.basename += '.min';
        }))
        .pipe(vfs.dest(modulePath + '/dist/_static/css'))        
        .on('end', function () {     
          $.util.log($.util.colors.green('结束' + mod + '模块任务styles！'));
          resolve();
        })
        .on('error', function (err) {
          $.util.log($.util.colors.red(mod + '模块任务styles失败！'));
          reject(err);
        });
    

    });
  };

};
