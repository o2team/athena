'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath, remoteName) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var inquirer = require('inquirer');
      var es = require('event-stream');
      var _ = require('lodash');
      var path = require('path');
      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      var noImage = args ? args.noImage : false;
      var deploy = appConf.deploy;
      var useShtml = appConf.useShtml;
      var readOutput = fs.readdirSync(modulePath + '/dist/output');
      var pages = [];
      var mapJson = JSON.parse(String(fs.readFileSync(modulePath + '/dist/map.json')));
      var pagesInclude = mapJson.include;

      readOutput.forEach(function (item) {
        if (item.indexOf('.html') >= 0) {
          pages.push({
            name: item,
            value: item
          });
        }
      });
      var prompt = [];
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
        var deployOptions = deploy[remoteName];
        var gulpSSH = new athenaMate.ssh({
          sshConfig: {
            host: deployOptions.host,
            port: deployOptions.port,
            username: deployOptions.user,
            password: deployOptions.pass
          }
        });
        var deployParams = {
          mode: deployOptions.mode,
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
        var combofileSHtmlList = [];
        var publishFiles = [];

        // 索引页，即站点地图
        var summaryPage = path.join(appPath, '.temp', 'index.html');
        if (answers.pages) {
          var dpath = modulePath + '/dist/output/';
          var cpath = modulePath + '/dist/output/combofile/';
          var imagesPath = dpath + 'images/';
          answers.pages.forEach(function (item) {
            var name = path.basename(item, path.extname(item));
            var htmlPath = dpath + item;
            var combofileHtmlPath = cpath + item;
            var combofileShtmlPath = cpath + name + '.shtml';
            // 获取页面所引用的资源
            var pageInclude = pagesInclude[item];

            htmlPathList.push(htmlPath);
            if (useShtml) {
              combofileSHtmlList.push(combofileShtmlPath);
            }
            if (!pageInclude) {
              $.util.log('页面' + $.util.colors.red(item) + '无引用资源，太奇怪了~');
            } else {
              var cssFiles = pageInclude.css;
              for (var i = 0; i < cssFiles.length; i++) {
                var cssName = cssFiles[i].name;
                var cssHashName = null;
                var cssMinHashName = null;
                var cssModuleName = cssFiles[i].module;
                if (cssModuleName === moduleConf.module) {
                  cssName = path.basename(cssName, '.css');
                  cssHashName = Util.getHashName(cssName + '.css', mapJson);
                  globPages.push(dpath + 'css/' + cssName + '.*');
                  globPages.push(dpath + 'css/' + cssHashName);
                  publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/css/' + cssName + '.css');
                  publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/css/' + cssHashName);
                }
              }

              var jsFiles = pageInclude.js;
              for (var i = 0; i < jsFiles.length; i++) {
                var jsName = jsFiles[i].name;
                var jsHashName = null;
                var jsModuleName = jsFiles[i].module;
                if (jsModuleName === moduleConf.module) {
                  jsHashName = Util.getHashName(jsName, mapJson);
                  jsName = path.basename(jsName, '.js');
                  globPages.push(dpath + 'js/' + jsName + '.*');
                  globPages.push(dpath + 'js/' + jsHashName);
                  publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/js/' + jsName + '.js');
                  publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/js/' + jsHashName);
                }
              }
            }
            if (useShtml) {
              publishFiles.push(deployOptions.shtmlPrefix + '/' + moduleConf.module + '/' + name + '.shtml');
            }
          });
          if (Util.existsSync(imagesPath)) {
            var publishImages = fs.readdirSync(imagesPath);
            if (publishImages && publishImages.sort && !noImage) {
              globPages.push(imagesPath + '**');
              publishImages.forEach(function (item) {
                publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/images/' + item);
              });
            }
          }

          // 使用http进行上传
          if (deployParams.mode === 'http') {
            vfs.src(globPages.concat(htmlPathList), { base: path.join(modulePath, 'dist', 'output') })
              .pipe(athenaMate.jdcFinder({
                erpid: deployRemoteParams.user,
                jfsToken: deployRemoteParams.pass,
                remotePath: deployRemoteParams.remotePath
              }))
              .pipe($.util.noop())
              .on('finish', function () {
                vfs.src(combofileSHtmlList)
                  .pipe(athenaMate.jdcFinder({
                    erpid: deployCssiParams.user,
                    jfsToken: deployCssiParams.pass,
                    remotePath: deployCssiParams.remotePath
                  }))
                  .pipe($.util.noop())
                  .on('finish', function () {
                    vfs.src(summaryPage, { base: path.join(appPath, '.temp') })
                      .pipe(athenaMate.jdcFinder({
                        erpid: deployRemoteParams.user,
                        jfsToken: deployRemoteParams.pass,
                        remotePath: deployOptions.remotePath
                      }))
                      .pipe($.util.noop())
                      .on('finish', function () {
                        $.util.log($.util.colors.green('你可能需要发布上线这些文件：'));
                        publishFiles.forEach(function (item) {
                          console.log('    ' + $.util.colors.bgCyan(item));
                        });
                        console.log();
                        console.log('    ' + $.util.colors.green('访问地址：' + 'http://' + deployOptions.domain + deployOptions.fdPath + appConf.app));
                        console.log();
                        resolve(publishFiles);
                      });
                  });
              });
            return;
          }

          // 端口为21认为是普通上传
          if (parseInt(deployRemoteParams.port, 10) === 21) {
            vfs.src(globPages.concat(htmlPathList), { base: path.join(modulePath, 'dist', 'output') })
              .pipe(athenaMate.ftp(deployRemoteParams))
              .pipe($.util.noop())
              .on('finish', function () {
                vfs.src(combofileSHtmlList)
                  .pipe(athenaMate.ftp(deployCssiParams))
                  .pipe($.util.noop())
                  .on('finish', function () {
                    vfs.src(summaryPage, { base: path.join(appPath, '.temp') })
                      .pipe(athenaMate.ftp(_.assign(_.clone(deployParams), {
                        remotePath: deployOptions.remotePath
                      })))
                      .pipe($.util.noop())
                      .on('finish', function () {
                        if (remoteName !== 'preview') {
                          $.util.log($.util.colors.green('你可能需要发布上线这些文件：'));
                          publishFiles.forEach(function (item) {
                            console.log('    ' + $.util.colors.bgCyan(item));
                          });
                          console.log();
                        }
                        console.log('    ' + $.util.colors.green('访问地址：' + 'http://' + deployOptions.domain + deployOptions.fdPath + appConf.app));
                        console.log();
                        resolve(publishFiles);
                      });
                  });
              });
          } else {
            vfs.src(globPages.concat(htmlPathList), { base: path.join(modulePath, 'dist', 'output') })
              .pipe(gulpSSH.dest(deployRemoteParams.remotePath))
              .on('finish', function () {
                vfs.src(combofileSHtmlList)
                  .pipe(gulpSSH.dest(deployCssiParams.remotePath))
                  .on('finish', function () {
                    vfs.src(summaryPage, { base: path.join(appPath, '.temp') })
                      .pipe(gulpSSH.dest(deployOptions.remotePath))
                      .on('finish', function () {
                        if (gulpSSH) {
                          gulpSSH.close();
                        }
                        if (remoteName !== 'preview') {
                          $.util.log($.util.colors.green('你可能需要发布上线这些文件：'));
                          publishFiles.forEach(function (item) {
                            console.log('    ' + $.util.colors.bgCyan(item));
                          });
                          console.log();
                        }
                        console.log('    ' + $.util.colors.green('访问地址：' + 'http://' + deployOptions.domain + deployOptions.fdPath + appConf.app));
                        console.log();
                        resolve(publishFiles);
                      });
                  });
              });
          }
        } else {
          console.log($.util.colors.red('没有要上传的文件！'));
          resolve();
        }
      });
    });
  };
};
