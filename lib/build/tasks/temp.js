'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var athenaMate = require('../athena_mate');

      var isPack = args.pack ? args.pack : false;
      var remoteName = args.remote ? args.remote : 'local';

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
        htmlStr += '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />';
        htmlStr += '<meta name="apple-mobile-web-app-capable" content="yes" />';
        htmlStr += '<meta name="apple-mobile-web-app-status-bar-style" content="black" />';
        htmlStr += '<meta name="format-detection" content="telephone=no" />';
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

      var stream = vfs.src(modulePath + '/dist/output/**', { base: modulePath + '/dist/output/' })
        .pipe(athenaMate.replace({
          cwd: appPath,
          module: moduleConf.module,
          pack: isPack,
          replaceType: remoteName
        }))
        stream.pipe(vfs.dest(modulePath + '/dist/output/'))
        .pipe(vfs.dest(appPath + '/.temp/' + moduleConf.module))
        .on('end', function () {
          generateTemp();
          if (remoteName !== 'local') {
            var deploy = appConf.deploy;
            var deployOptions = deploy[remoteName];
            vfs.src(modulePath + '/dist/output/*.html').pipe(athenaMate.combo({
              app: moduleConf.app,
              module: moduleConf.module,
              cwd: appPath,
              fdPath: deployOptions.fdPath,
              domain: deployOptions.domain
            }))
            .pipe($.if('*.html', vfs.dest(modulePath + '/dist/output/'),vfs.dest(modulePath + '/dist/output/combofile')))
            .on('finish', function () {
              resolve();
            });
          } else {
            resolve();
          }
        });
    });
  };
};
