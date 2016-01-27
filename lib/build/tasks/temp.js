'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var inquirer = require('inquirer');
      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      var isPack = (args && args.pack) ? args.pack : false;
      var remoteName = (args && args.remote) ? args.remote : 'local';
      var isPublish = (args && args.isPublish) ? args.isPublish : false;
      var shtmlConf = appConf.shtml ? appConf.shtml : {
        use: false,
        needCombo: false
      };

      function generateTemp () {
        var tempFolder = path.join(appPath, '.temp');
        var indexFile = path.join(tempFolder, 'index.html');
        if (Util.existsSync(indexFile)) {
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
        var moduleListInfo = {};
        for (var k = 0; k < folders.length; k++) {
          var modConfPath = path.join(appPath, folders[k], 'module-conf.js');
          if (!Util.existsSync(modConfPath)) {
            continue;
          } else {
            var modConf = require(modConfPath);
          }
          var subFolder = path.join(tempFolder, folders[k]);
          var subHtmlFiles = [];
          var subFiles = fs.readdirSync(subFolder);
          moduleListInfo[folders[k]] = modConf;
          for (var j = 0; j < subFiles.length; j++) {
            var subName = path.join(subFolder, subFiles[j]);
            if (fs.statSync(subName).isFile() && path.extname(subName).indexOf('html') >= 0) {
              var title = null;
              try {
                var htmlContents = String(fs.readFileSync(subName));
                var matchs = htmlContents.match(/<title[^>]*>([^<]+)<\/title>/);
                if (matchs) {
                  title = matchs[1];
                }
              } catch (e) {
                title = null;
              }
              subHtmlFiles.push({
                fileName: subFiles[j],
                title: title
              });
            }
          }
          htmlFiles[folders[k]] = subHtmlFiles;
        }
        var title = appConf.description ? appConf.description : appConf.app;
        var htmlStr = '<!DOCTYPE html>';
        htmlStr += '<html>';
        htmlStr += '<head>';
        htmlStr += '<meta charset="UTF-8">';
        htmlStr += '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />';
        htmlStr += '<meta name="apple-mobile-web-app-capable" content="yes" />';
        htmlStr += '<meta name="apple-mobile-web-app-status-bar-style" content="black" />';
        htmlStr += '<meta name="format-detection" content="telephone=no" />';
        htmlStr += '<title>' + title + '</title>';
        htmlStr += '<style>@charset "UTF-8";*{-webkit-tap-highlight-color:transparent;-webkit-tap-highlight-color:rgba(0,0,0,0.0);outline:0;margin:0;padding:0;vertical-align:baseline}body,h1,h2,h3,h4,h5,h6,hr,p,blockquote,dl,dt,dd,ul,ol,li,pre,form,fieldset,legend,button,input,textarea,th,td{margin:0;padding:0;vertical-align:baseline}img{border:0 none;vertical-align:top}i,em{font-style:normal}ol,ul{list-style:none}input,select,button,h1,h2,h3,h4,h5,h6{font-size:100%;font-family:inherit}table{border-collapse:collapse;border-spacing:0}a{text-decoration:none;color:#666}body{margin:0 auto;min-width:320px;max-width:640px;height:100%;font-size:14px;font-family:Helvetica,STHeiti STXihei,Microsoft JhengHei,Microsoft YaHei,Arial;line-height:1.5;color:#666;-webkit-text-size-adjust:100%!important;-ms-text-size-adjust:100%!important;text-size-adjust:100%!important;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;background-color: #F1F1F1;}input[type="text"],textarea{-webkit-appearance:none;-moz-appearance:none;appearance:none}.mod_container{padding-bottom: 20px;}.info{padding:20px;text-align:center}.info h1{font-size:20px;font-weight:normal;color:#999;margin-bottom:10px}.info h2{font-size:28px;color:#333}.mod{padding:0 10px}.mod_title{margin:15px 0 10px;font-size:18px}.mod_list{background-color:#fff;border:1px solid #E8E8E9}.mod_list li{height:50px;line-height:50px;padding:0 10px;border-bottom:1px solid #E8E8E9}.mod_list li:last-child{border-bottom:0px none}.mod_list li a{display:block;color:#333;position:relative;width:100%}.mod_list_link{float:right;color:#999;font-size:12px;margin-right:50px}.mod_list li a:after{width:9px;height:15px;display:block;content:"";position:absolute;top:17px;right:15px;background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAeCAYAAAAhDE4sAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyFpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDE0IDc5LjE1MTQ4MSwgMjAxMy8wMy8xMy0xMjowOToxNSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo3QkZBQ0E3RTQ0QUUxMUU0OThCNDg3RDJGMTNFOTIwOCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo3QkZBQ0E3RjQ0QUUxMUU0OThCNDg3RDJGMTNFOTIwOCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjdCRkFDQTdDNDRBRTExRTQ5OEI0ODdEMkYxM0U5MjA4IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjdCRkFDQTdENDRBRTExRTQ5OEI0ODdEMkYxM0U5MjA4Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+2KlQdAAAAa5JREFUeNqclc0rRFEYxs/MnUZsZjWymNmNpaKsJjQKmVn42JFIzUr+AjasxJ6FSFkplEJphFhaara2xAqbCTV43nqmTqeD996nfpv3zjz3nvfrxPL5vKGWwDtYMxGUsEyWwTd4BZthjeKWiSgGNsBEFKNmJxaAXVAKa7TAP9pKggPQE8ZI8lIGx86zFnAKOrVGojqYBDfO8xQ4B+1aI1ENjIKq85s0uAIZrZHoDQyBeyeeoVlaayR6AkXw7MTleBUeV2Vk+EWD/EJbXeCEhVAZGeZqjLmz1cvWSGqNRNesZt2Jl9h7gdbIsL/K7DdbMkbrHCsTZLNZTb/dgQ8w4MS7QRO4jIcYp69f4jHt0UQzYNUT3+KsqoxGwE7jzZYOwVwjd/8Z9YE9uzrUBZiyq/mXUQcr5jbfLWfyU9NHOU59ytOkRU+Teo1awRlo84yNmLxoZi3F8+ec+CNNHjTTL7k4Ym5sya0y7FktXqOA1el3ntdoUtVsSOmPbfaLLanKOKuk2tkrYNaJS39Ms3LqW6TiLH3p1HmwH/Zek51TYH7EcDHKlZ1wlljBRNSPAAMAfc1SXwN6CmUAAAAASUVORK5CYII=");background-repeat:no-repeat;background-position:-0px -0px;background-size:9px 15px;opacity:0.5}</style>';
        htmlStr += '</head>';
        htmlStr += '<body>';
        htmlStr += '<div class="mod_container">';
        htmlStr += '<div class="info">';
        htmlStr += '<h1>Athena SiteMap</h2>';
        htmlStr += '<h2>' + title + '项目</h3>';
        htmlStr += '</div>';
        for (var key in htmlFiles) {
          htmlStr += '<div class="mod">';
          htmlStr += '<h3 class="mod_title">' + key + ' - ' + moduleListInfo[key].description + '</h3>';
          htmlStr += '<ul class="mod_list">';
          for (var g in htmlFiles[key]) {
            var item = htmlFiles[key][g];
            var title = item.title;
            title = (title === null) ? item.fileName : title;
            htmlStr += '<li><a href="' + key + '/' + item.fileName + '">' + title  + '<span class="mod_list_link">' + key + '/' + item.fileName + '</span></a>';
            htmlStr += '</li>';
          }
          htmlStr += '</ul>';
          htmlStr += '</div>';
        }
        htmlStr += '</div>';
        htmlStr += '</body>';
        htmlStr += '</html>';
        fs.writeFileSync(indexFile, htmlStr);
      }

      function generateFiles() {
        var stream = vfs.src(path.join(modulePath, 'dist', 'output', '**'), { base: path.join(modulePath, 'dist', 'output') })
          .pipe(athenaMate.replace({
            cwd: appPath,
            module: moduleConf.module,
            pack: isPack,
            replaceType: remoteName
          }))
          stream.pipe(vfs.dest(path.join(modulePath, 'dist', 'output')))
          .pipe(vfs.dest(path.join(appPath, '.temp', moduleConf.module)))
          .on('end', function () {
            generateTemp();

            if (remoteName !== 'local' && remoteName !== 'preview') {
              var deploy = appConf.deploy;
              var deployOptions = deploy[remoteName];
              vfs.src(path.join(modulePath, 'dist', 'output', '*.html'))
                .pipe(athenaMate.if(shtmlConf.use, athenaMate.combo({
                  app: moduleConf.app,
                  module: moduleConf.module,
                  cwd: appPath,
                  fdPath: deployOptions.fdPath,
                  domain: deployOptions.domain,
                  needCombo: shtmlConf.needCombo,
                  comboPrefix: deployOptions.comboPrefix
                })))
                .pipe(athenaMate.if('*.html', vfs.dest(path.join(modulePath, 'dist', 'output')), vfs.dest(path.join(modulePath, 'dist', 'output', 'combofile'))))
                .on('finish', function () {
                  resolve(remoteName);
                });
            } else {
              resolve(remoteName);
            }
          });
      }

      if (isPublish) {
        var prompt = [];
        var deployObj = appConf.deploy;
        var choices = [];
        for (var i in deployObj) {
          if (i !== 'local') {
            choices.push({
              name: i + ' (' + deployObj[i].domain + ')',
              value: i
            });
          }
        }
        prompt.push({
          type: 'list',
          name: 'remote',
          message: '请选择将要发布的远程机器',
          store: true,
          required: true,
          choices: choices
        });
        inquirer.prompt(prompt, function (answers) {
          remoteName = answers.remote;
          generateFiles();
        });
      } else {
        generateFiles();
      }
    });
  };
};
