/**
* @fileoverview css文件生成allinone，将页面引用的css文件打包成一个文件，不是combo形式
* @author  luowenlin
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      const path = require('path');
      const fs = require('fs');
      const vfs = require('vinyl-fs');
      const through2 = require('through2');

      $.util.log($.util.colors.green('开始扫描' + mod + '模块所有css文件！'));
      let mapJsonPath = path.join(modulePath, 'dist', 'map.json');
      const mapJson = JSON.parse(String(fs.readFileSync(mapJsonPath)));
      const pageInclude = mapJson.include;
      let pages = path.join(modulePath, 'dist', '_', 'page', '**', '*.html');
      if (typeof args.page === 'string') {
        pages = path.join(modulePath, 'dist', '_', 'page', '**', args.page + '.html');
      }
      return vfs.src([pages])
        .pipe(through2.obj(function(file, enc, cb) {
            if (file.isNull() || file.isStream()) {
                return cb(null, file);
            }
            let name = path.basename(file.path);
            let page = name.replace(".html","");
            if(!pageInclude[name]){
                cb();
                return;
            }
            let css = pageInclude[name].css;
            let newFile=[];
            css.forEach(d =>{
                if(d.name.indexOf("allinone")>=0) return;
                let f = "";
                if(d.module==mod){
                   f = path.join(modulePath,'dist', '_static', 'css',d.name);
                }else{
                    f = path.join(appPath,d.module,'dist', 'output', 'css',d.name);
                }
                if(fs.existsSync(f)){
                  newFile.push(String(fs.readFileSync(f)));
                }else{
                  $.util.log($.util.colors.red('文件 ' + d.name + ' 在模块 ' + d.module + ' 中没有找到！'));
                }
            });
            let newName= "allinone_"+page+".css";
            css.push({name:newName,module:mod});
            fs.writeFileSync(mapJsonPath, JSON.stringify(mapJson, null, 2));
            var f = new $.util.File({
                path: path.join(modulePath, 'dist', '_static', 'css', newName),
                base: path.join(modulePath, 'dist', '_static', 'css'),
                contents: new Buffer(newFile.join(''))
            });
            this.push(f);
            cb();
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', '_static', 'css')))
        .on('finish', function() {
          resolve();
        });
    });
  };
};
