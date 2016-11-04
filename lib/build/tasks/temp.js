/**
* @fileoverview client模式，做地址替换，同时将文件拷贝到.temp目录下
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs');
      var path = require('path');
      var vfs = require('vinyl-fs');
      var inquirer = require('inquirer');
      var _ = require('lodash');
      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      var isPack = (args && args.pack) ? args.pack : false;
      var isCompress = (args && args.compress) ? args.compress : false;
      var remoteName = (args && args.remote) ? args.remote : 'local';
      var isPublish = (args && args.isPublish) ? args.isPublish : false;
      var isServe = (args && args.isServe) ? args.isServe : false;
      var isRelease = (args && args.release) ? args.release : false;

      /**
       * 生成.temp中站点地图索引
       */
      function generateTemp () {
        var tempFolder = path.join(appPath, '.temp');
        var indexFile = path.join(tempFolder, appConf.app, 'index.html');
        if (Util.existsSync(indexFile)) {
          fs.unlinkSync(indexFile);
        }
        if (!Util.existsSync(tempFolder)) {
          return;
        }
        var moduleList = appConf.moduleList;
        var moduleListInfo = {};
        var htmlFiles = {};
        moduleList.forEach(function (item) {
          var modulePath = path.join(appPath, item);
          var modulePagePath = path.join(modulePath, 'page');
          var moduleConfPath = path.join(modulePath, 'module-conf.js');
          var subHtmlFiles = [];
          if (!Util.existsSync(moduleConfPath)) {
            return false;
          }
          if (!Util.existsSync(modulePagePath)) {
            return false;
          }
          var modConf = require(moduleConfPath);
          moduleListInfo[item] = modConf;
          var files = fs.readdirSync(modulePagePath);
          for (var i = 0; i < files.length; i++) {
            var folder = files[i];
            var fullPath = path.join(modulePagePath, folder);
            if (fs.statSync(fullPath).isDirectory()) {
              var subFiles = fs.readdirSync(fullPath);
              for (var j = 0; j < subFiles.length; j++) {
                var tplFilePath = path.join(fullPath, subFiles[j]);
                if (!Util.existsSync(tplFilePath)) {
                  continue;
                }
                if (fs.statSync(tplFilePath).isFile() && Util.regexps.tpl.test(path.extname(tplFilePath))) {
                  var title = null;
                  try {
                    var htmlContents = String(fs.readFileSync(tplFilePath));
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
            }
          }
          htmlFiles[item] = subHtmlFiles;
        });
        var title = appConf.description ? appConf.description : appConf.app;
        var ip = Util.getLocalIp();
        var url = '';
        if (remoteName === 'local') {
          url = 'http://' + ip + ':35729/' + appConf.app;
        } else {
          var deploy = appConf.deploy;
          var deployOptions = deploy[remoteName];
          if (!deployOptions) {
            var err = new Error('没有在app-conf.js中找到名为' + remoteName + '的服务器配置，请检查！');
            console.log(err.stack);
            process.exit(1);
          }
          url = 'http://' + deployOptions.domain + deployOptions.fdPath + appConf.app;
        }
        var htmlStr = '<!DOCTYPE html>';
        htmlStr += '<html>';
        htmlStr += '<head>';
        htmlStr += '<meta charset="UTF-8">';
        htmlStr += '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />';
        htmlStr += '<meta name="apple-mobile-web-app-capable" content="yes" />';
        htmlStr += '<meta name="apple-mobile-web-app-status-bar-style" content="black" />';
        htmlStr += '<meta name="format-detection" content="telephone=no" />';
        htmlStr += '<title>' + title + '</title>';
        htmlStr += '<style>@charset "UTF-8";*{-webkit-tap-highlight-color:rgba(0,0,0,0);outline:0}*,blockquote,body,button,dd,dl,dt,fieldset,form,h1,h2,h3,h4,h5,h6,hr,input,legend,li,ol,p,pre,td,textarea,th,ul{margin:0;padding:0;vertical-align:baseline}img{border:0 none;vertical-align:top}em,i{font-style:normal}ol,ul{list-style:none}button,h1,h2,h3,h4,h5,h6,input,select{font-size:100%;font-family:inherit}table{border-collapse:collapse;border-spacing:0}a{text-decoration:none}a,body{color:#666}body{margin:0 auto;min-width:20pc;max-width:40pc;height:100%;font-size:14px;font-family:Helvetica,STHeiti STXihei,Microsoft JhengHei,Microsoft YaHei,Arial;line-height:1.5;-webkit-text-size-adjust:100%!important;-ms-text-size-adjust:100%!important;text-size-adjust:100%!important;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;background-color:#f1f1f1}input[type=text],textarea{-webkit-appearance:none;-moz-appearance:none;appearance:none}.mod_container{padding-bottom:20px}.info{padding:20px;text-align:center}.info h1{font-size:20px;font-weight:400;color:#999;margin-bottom:10px}.info h2{font-size:28px;color:#333}.mod{padding:0 10px}.mod_title{margin:15px 0 10px;font-size:18px}.mod_list{background-color:#fff;border:1px solid #e8e8e9}.mod_list li{height:50px;line-height:50px;padding:0 10px;border-bottom:1px solid #e8e8e9}.mod_list li:last-child{border-bottom:0 none}.mod_list li a{display:block;color:#333;position:relative;width:100%}.mod_list_link{float:right;color:#999;font-size:9pt;margin-right:50px}.mod_list li a:after{width:9px;height:15px;display:block;content:"";position:absolute;top:17px;right:15px;background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAeCAYAAAAhDE4sAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyFpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDE0IDc5LjE1MTQ4MSwgMjAxMy8wMy8xMy0xMjowOToxNSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo3QkZBQ0E3RTQ0QUUxMUU0OThCNDg3RDJGMTNFOTIwOCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo3QkZBQ0E3RjQ0QUUxMUU0OThCNDg3RDJGMTNFOTIwOCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjdCRkFDQTdDNDRBRTExRTQ5OEI0ODdEMkYxM0U5MjA4IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjdCRkFDQTdENDRBRTExRTQ5OEI0ODdEMkYxM0U5MjA4Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+2KlQdAAAAa5JREFUeNqclc0rRFEYxs/MnUZsZjWymNmNpaKsJjQKmVn42JFIzUr+AjasxJ6FSFkplEJphFhaara2xAqbCTV43nqmTqeD996nfpv3zjz3nvfrxPL5vKGWwDtYMxGUsEyWwTd4BZthjeKWiSgGNsBEFKNmJxaAXVAKa7TAP9pKggPQE8ZI8lIGx86zFnAKOrVGojqYBDfO8xQ4B+1aI1ENjIKq85s0uAIZrZHoDQyBeyeeoVlaayR6AkXw7MTleBUeV2Vk+EWD/EJbXeCEhVAZGeZqjLmz1cvWSGqNRNesZt2Jl9h7gdbIsL/K7DdbMkbrHCsTZLNZTb/dgQ8w4MS7QRO4jIcYp69f4jHt0UQzYNUT3+KsqoxGwE7jzZYOwVwjd/8Z9YE9uzrUBZiyq/mXUQcr5jbfLWfyU9NHOU59ytOkRU+Teo1awRlo84yNmLxoZi3F8+ec+CNNHjTTL7k4Ym5sya0y7FktXqOA1el3ntdoUtVsSOmPbfaLLanKOKuk2tkrYNaJS39Ms3LqW6TiLH3p1HmwH/Zek51TYH7EcDHKlZ1wlljBRNSPAAMAfc1SXwN6CmUAAAAASUVORK5CYII=");background-repeat:no-repeat;background-position:0 0;background-size:9px 15px;opacity:.5}.qrcode{width:200px;height:auto;position:fixed;top:50%;right:20px;margin-top:-75pt}@media (max-width:998px){.qrcode{position:static;display:block;margin:10px auto}}</style>';
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
        if (appConf.platform !== 'pc') {
          htmlStr += '<img class="qrcode" src="http://qr.liantu.com/api.php?text=' + url + '">';
        }
        htmlStr += '</body>';
        htmlStr += '</html>';
        fs.writeFileSync(indexFile, htmlStr);
      }

      /**
       * 处理文件
       */
      function generateFiles() {
        vfs.src(path.join(modulePath, 'dist', 'output', '**'), { base: path.join(modulePath, 'dist', 'output') })
          .pipe(athenaMate.replace({
            cwd: appPath,
            module: moduleConf.module,
            pack: isPack,
            serve: isServe,
            compress: isCompress,
            release: isRelease,
            replaceType: remoteName,
            base64Opts: moduleConf.support.base64
          }))
          .pipe(vfs.dest(path.join(modulePath, 'dist', 'output')))
          .pipe(vfs.dest(path.join(appPath, '.temp', appConf.app, moduleConf.module)))
          .on('end', function () {
            generateTemp();

            if (remoteName !== 'local' && remoteName !== 'preview') {
              var deploy = appConf.deploy;
              var deployOptions = deploy[remoteName];
              var shtml = _.assign(_.clone(appConf.shtml), deployOptions.shtml || {});
              var shtmlConf = (shtml && !_.isEmpty(shtml)) ? shtml : {
                use: false,
                needCombo: false,
                needTimestamp: false
              };
              vfs.src(path.join(modulePath, 'dist', 'output', '*.html'))
                .pipe($.if(!!shtmlConf.use, athenaMate.combo({
                  app: moduleConf.app,
                  module: moduleConf.module,
                  cwd: appPath,
                  needCombo: !!shtmlConf.needCombo,
                  fdPath: deployOptions.fdPath,
                  domain: deployOptions.domain,
                  needTimestamp: !!shtmlConf.needTimestamp,
                  comboPrefix: deployOptions.comboPrefix ? deployOptions.comboPrefix : '/c/=',
                  shtmlCommentPrefix: deployOptions.shtmlCommentPrefix
                })))
                .pipe($.if('*.html', vfs.dest(path.join(modulePath, 'dist', 'output')), vfs.dest(path.join(modulePath, 'dist', 'output', 'combofile'))))
                .on('finish', function () {
                  resolve(remoteName);
                });
            } else {
              resolve(remoteName);
            }
          });
      }

      // 如果是ath publish，并且不知道远程机器，则需要选择机器名
      if (isPublish && (typeof remoteName !== 'string' || remoteName === 'local')) {
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
