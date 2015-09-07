'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var inquirer = require('inquirer');
      var es = require('event-stream');
      var _ = require('lodash');
      var path = require('path');
      var athenaMate = require('athena-mate');

      var deploy = appConf.deploy;
      var qiang = deploy.qiang;
      var readDist = fs.readdirSync(modulePath + '/dist');
      var pages = [];
      var mapJson = JSON.parse(String(fs.readFileSync(modulePath + '/dist/map.json')));
      var pagesInclude = mapJson.include;
      readDist.forEach(function (item) {
        if (item.indexOf('.html') >= 0) {
          pages.push({
            name: item,
            value: item
          });
        }
      });
      var prompt = [];
      prompt.push({
        type: 'list',
        name: 'remote',
        message: '请选择将要发布的远程机器',
        store: true,
        required: true,
        choices: [{
          name: 'tencent',
          value: 'tencent'
        }, {
          name: 'jdTest',
          value: 'jdTest'
        }]
      });
      if (pages.length > 0) {
        prompt.push({
          type: 'checkbox',
          name: 'pages',
          message: '请选择将要发布的页面',
          required: true,
          store: true,
          choices: pages,
          validate: function (input) {
            if (input.length === 0) {
              return '一定要选择一个页面哦~';
            }
            return true;
          }.bind(this)
        });
      }

      inquirer.prompt(prompt, function (answers) {
        var deploy = appConf.deploy;
        var deployOptions = deploy[answers.remote];
        var gulpSSH = new $.ssh({
          sshConfig: {
            host: deployOptions.host,
            port: deployOptions.port,
            username: deployOptions.user,
            password: deployOptions.pass
          }
        });
        var deployParams = {
          host: deployOptions.host,
          user: deployOptions.user,
          pass: deployOptions.pass,
          port: deployOptions.port
        };
        var deployRemoteParams = _.assign(_.clone(deployParams), {
          remotePath: deployOptions.remotePath + '/' + moduleConf.module
        });
        var deployCssiParams = _.assign(_.clone(deployParams), {
          remotePath: deployOptions.cssi + '/' + moduleConf.module
        });
        var globPages = [];
        var htmlPathList = [];
        var combofileHtmlList = [];
        var combofileSHtmlList = [];
        var publishFiles = [];
        if (answers.pages) {
          answers.pages.forEach(function (item) {
            var name = path.basename(item, '.html');
            var dpath = modulePath + '/dist/';
            var cpath = modulePath + '/dist/combofile/';
            var htmlPath = dpath + item;
            var combofileHtmlPath = cpath + item;
            var combofileShtmlPath = cpath + name + '.shtml';
            var imagesPath = dpath + 'images/*';
            // 获取页面所引用的资源
            var pageInclude = pagesInclude[item];

            htmlPathList.push(htmlPath);
            combofileHtmlList.push(combofileHtmlPath);
            combofileSHtmlList.push(combofileShtmlPath);
            if (!pageInclude) {
              $.util.log('页面' + $.util.colors.red(item) + '无引用资源，太奇怪了~');
            } else {
              var cssFiles = pageInclude.css;
              for (var i = 0; i < cssFiles.length; i++) {
                var cssName = cssFiles[i].name;
                var cssModuleName = cssFiles[i].module;
                if (cssModuleName === moduleConf.module) {
                  cssName = path.basename(cssName, '.css');
                  globPages.push(dpath + 'css/' + cssName + '.*');
                  publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/css/' + cssName + '.css');
                  publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/css/' + cssName + '.min.css');
                }
              }

              var jsFiles = pageInclude.js;
              for (var i = 0; i < jsFiles.length; i++) {
                var jsName = jsFiles[i].name;
                var cssModuleName = jsFiles[i].module;
                if (cssModuleName === moduleConf.module) {
                  jsName = path.basename(jsName, '.js');
                  globPages.push(dpath + 'css/' + jsName + '.*');
                  publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/js/' + jsName + '.js');
                }
              }
            }
            globPages.push(imagesPath);
            publishFiles.push(deployOptions.shtmlPrefix + '/' + name + '.shtml');
          });
          vfs.src(globPages, { base: modulePath + '/dist' })
            .pipe($.if(answers.remote === 'tencent', $.ftp(deployRemoteParams)))
            .pipe($.if(answers.remote === 'jdTest', gulpSSH.dest(deployRemoteParams.remotePath)))
            .pipe($.util.noop()).on('finish', function (err) {

              if (err) {
                $.util.log(err);
              }
              // 执行combo操作
              vfs.src(htmlPathList)
                .pipe(athenaMate.combo({
                  app: moduleConf.app,
                  module: moduleConf.module,
                  fdPath: deployOptions.fdPath,
                  domain: deployOptions.domain
                }))
                .pipe(vfs.dest(modulePath + '/dist/combofile'))
                .on('finish', function (err) {
                  if (err) {
                    $.util.log(err);
                  }
                  es.merge(
                    vfs.src(combofileHtmlList)
                      .pipe($.if(answers.remote === 'jdTest', gulpSSH.dest(deployOptions.remotePath + '/' + moduleConf.module)))
                      .pipe($.if(answers.remote === 'tencent', $.ftp(deployRemoteParams))),
                    vfs.src(combofileSHtmlList)
                      .pipe($.if(answers.remote === 'jdTest', gulpSSH.dest(deployOptions.cssi + '/' + moduleConf.module)))
                      .pipe($.if(answers.remote === 'tencent', $.ftp(deployCssiParams)))
                  ).on('end', function () {
                    if (gulpSSH) {
                      gulpSSH.close();
                    }
                    var str = '';
                    publishFiles.forEach(function (item) {
                      str += item + '\n';
                    });
                    $.util.log($.util.colors.green('你可能需要发布上线这些文件：'));
                    $.util.log(str);
                    resolve();
                  });
                });
            });
        } else {
          vfs.src(modulePath + '/dist/**', { base: modulePath + '/dist' })
            .pipe($.if(answers.remote === 'tencent', $.ftp(deployRemoteParams)))
            .pipe($.if(answers.remote === 'jdTest', gulpSSH.dest(deployOptions.remotePath + '/' + moduleConf.module)))
            .pipe($.util.noop()).on('finish', function (err) {
              if (err) {vfs
                $.util.log(err);
              }
              if (gulpSSH) {
                gulpSSH.close();
              }
              resolve();
            });
        }
      });
    });
  };
};
