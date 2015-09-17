'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      function generateTemp () {
        var tempFolder = path.join(appPath, '.temp');
        var indexFile = path.join(tempFolder, 'index.html');
        if (fs.existsSync(indexFile)) {
          fs.unlinkSync(indexFile);
        }
        var files = fs.readdirSync(tempFolder);
        var folders = [];
        var htmlFiles = {};
        for (var i in files){
          var name = path.join(tempFolder, files[i]);
          if (fs.statSync(name).isDirectory()) {
            folders.push(files[i]);
          }
        }
        for (var k = 0; k < folders.length; k++) {
          var subFolder = path.join(tempFolder, folders[k]);
          var subHtmlFiles = [];
          var subFiles = fs.readdirSync(subFolder);
          for (var j = 0; j < subFiles.length; j++) {
            var subName = path.join(subFolder, subFiles[j]);
            if (fs.statSync(subName).isFile() && path.extname(subName).indexOf('html') >= 0) {
              subHtmlFiles.push(subFiles[j]);
            }
          }
          htmlFiles[folders[k]] = subHtmlFiles;
        }
        var htmlStr = '<!DOCTYPE html>';
        htmlStr += '<html>';
        htmlStr += '<head>';
        htmlStr += '<meta charset="UTF-8">';
        htmlStr += '<title>Document</title>';
        htmlStr += '</head>';
        htmlStr += '<body>';
        for (var key in htmlFiles) {
          htmlStr += '<h2>' + key + '</h2>';
          htmlStr += '<ul>';
          for (var g in htmlFiles[key]) {
            htmlStr += '<li><a href="' + key + '/' + htmlFiles[key][g] + '">' + htmlFiles[key][g] + '</a></li>';
          }
          htmlStr += '</ul>';
        }
        htmlStr += '</body>';
        htmlStr += '</html>';
        fs.writeFileSync(indexFile, htmlStr);
      }

      vfs.src(modulePath + '/dist/output/**', { base: modulePath + '/dist/output/' })
        .pipe(athenaMate.replace({
          cwd: appPath,
          module: moduleConf.module
        }))
        .pipe(vfs.dest(appPath + '/.temp/' + moduleConf.module))
        .on('end', function () {
          generateTemp();
          resolve();
        });
    });
  };
};
