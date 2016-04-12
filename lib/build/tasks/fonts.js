/**
* @fileoverview 字体编译
*/

'use strict';
module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {

    return new Promise(function (resolve, reject) {
        var fontconf = moduleConf.support.fontcompress;
        if(!fontconf || !fontconf.enable) {
          resolve();
          return;
        }

        var path = require('path');
        var vfs = require('vinyl-fs');
        var fs = require('fs');
        var path = require('path');
        var through2 = require('through2');
        var FontCompress = require('../font_compress');
        var Util = require('../../util');
        $.util.log($.util.colors.green('开始' + mod + '模块任务font！'));

        var outputpath = path.join(modulePath,'dist/output');
        var vfs = require('vinyl-fs');
        var link   = /<link[^><]+>/ig,
            href   = /(href[\s\"\'\=]{2,})([a-z0-9\/\.\_]{3,})([\?a-z\=]*[0-9a-zA-Z]*)[\'\"]/i;

        vfs.src(path.join(outputpath , '/*.html'))
        .pipe(function(){

          return through2.obj(function(file, enc, cb){
            if(file.isNull()){
              return cb(null, file);
            }

            if ( file.isStream() ){
                return cb(null,file);
            }else{
                var content = file.contents.toString("utf-8");
            }


            var newContent = content.replace(link,function(o,i){
              var r = href.exec(o);

              if(!r)
                return o;

              var _href = r[2].replace(/^\/[^\/]*\/css/,'../static/css');

              var _r = o.replace(r[2],_href);
              return _r;
            });


            var buffer = new Buffer(newContent);
            file.contents = buffer;
            return cb(null,file);
          });


        }())
        .pipe(vfs.dest(path.join(modulePath,'_page/')))

        .on('finish', function() {


          new FontCompress([path.join(modulePath , '_page/*.html')], {

            // 忽略的文件规则。
              ignore: ['*.eot', 'icons.css', 'font?name=*'],

              // dest path
              dest: path.join(modulePath,'dist/_static'),
              modulePath: path.join(modulePath)

            }).then(function (webFonts) {
              if (webFonts.length === 0) {
                $.util.log($.util.colors.red('引用了字体没有找到！'));
                  resolve();
                  return;
              }
              // TO-DO 压缩数据统计
              // webFonts.forEach(function (webFont) {
                  // webFont.files.forEach(function (file) {
                  //     if (fs.existsSync(file)) {
                  //         // console.log('File', path.relative('./', file),
                  //         //     'created:', fs.statSync(file).size / 1000, 'KB');
                  //     } else {
                  //         console.error('File', path.relative('./', file), 'not created');
                  //     }
                  // });
              // });
              $.util.log($.util.colors.green('结束' + mod + '模块任务font！'));
              Util.rmfolder(path.join(modulePath,'_page/'));
              resolve();
          })
          .catch(function (errors) {
               $.util.log($.util.colors.red(mod + '模块任务font失败！'));
              reject(errors);
          });

        }).on('err', function (err) {

          reject(err);
        });


    });
  }
}
