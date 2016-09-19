/**
* @fileoverview client模式，生成完整html
* @author  liweitao
*/

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath, remoteName) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var fs = require('fs');
      var inquirer = require('inquirer');
      var _ = require('lodash');
      var path = require('path');
      var through2 = require('through2');
      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      var noImage = args ? args.noImage : false;
      var isAll = args ? args.all : false;
      var isShowAll = args ? args.showall : false;

      var readOutput = fs.readdirSync(path.join(modulePath, 'dist', 'output'));
      var pages = [];
      var mapJson = JSON.parse(String(fs.readFileSync(path.join(modulePath, 'dist', 'map.json'))));
      var pagesInclude = mapJson.include;

      var allPages = [];

      function generatePublishFiles (file, deployOptions, publishFiles) {
        var name = path.basename(file.path);
        var ext = path.extname(name);
        var p = Util.getStaticPath(file.path).path.replace(/\\/ig,'/');
        var publishP = deployOptions.assestPrefix + '/' + moduleConf.module + '/' + p;
        if (Util.regexps.js.test(ext)
          || Util.regexps.css.test(ext)
          || Util.regexps.media.test(ext)
          && publishFiles.indexOf(publishP) < 0) {
          publishFiles.push(publishP);
        }
      }
      
      if (typeof remoteName === 'string') {
        $.util.log($.util.colors.green('即将发布到远程机器' + remoteName));
      } else {
        return reject();
      }
      
      readOutput.forEach(function (item) {
        if (Util.regexps.tpl.test(path.extname(item))) {
          pages.push({
            name: item,
            value: item
          });
          allPages.push(item);
        }
      });
      if (pages.length > 1) {
        pages.unshift({
          name: '全部',
          value: allPages
        });
      }
      if (isAll) {
        publish(allPages);
      } else {
        if (pages.length > 0) {
          var prompt = [];
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
          inquirer.prompt(prompt, function (answers) {
            publish(answers.pages);
          });
        } else {
          console.log($.util.colors.red('没有要上传的页面！'));
          resolve();
        }
      }

      function publish (pPages) {
        var deploy = appConf.deploy;
        var deployOptions = deploy[remoteName];
        var shtml = _.assign(_.clone(appConf.shtml), deployOptions.shtml || { });
        var shtmlConf = (shtml && !_.isEmpty(shtml)) ? shtml : {
          use: false,
          needCombo: false,
          needTimestamp: false
        };
        var useShtml = shtmlConf ? shtmlConf.use : false;
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
        var summaryPage = path.join(appPath, '.temp', appConf.app, 'index.html');

        if (pPages) {
          var filterPages = [];
          pPages.forEach(function (item) {
            if (_.isArray(item)) {
              item.forEach(function (i) {
                if (filterPages.indexOf(i) < 0) {
                  filterPages.push(i);
                }
              });
            } else {
              if (filterPages.indexOf(item) < 0) {
                filterPages.push(item);
              }
            }
          });
          var dpath = path.join(modulePath, 'dist', 'output');
          var cpath = path.join(modulePath, 'dist', 'output', 'combofile');
          var imagesPath = path.join(dpath, 'images');
          filterPages.forEach(function (item) {
            var name = path.basename(item, path.extname(item));
            var htmlPath = path.join(dpath, item);
            // 获取页面所引用的资源
            var pageInclude = pagesInclude[item];

            htmlPathList.push(htmlPath);
            if (!pageInclude) {
              $.util.log('页面' + $.util.colors.red(item) + '无引用资源，太奇怪了~');
            }
            if (useShtml) {
              var combofileShtmlPath = path.join(cpath, name + '.shtml');
              var combofileJSShtmlPath = path.join(cpath, name + '_js.shtml');
              combofileSHtmlList.push(combofileShtmlPath);
              combofileSHtmlList.push(combofileJSShtmlPath);
              publishFiles.push(deployOptions.shtmlPrefix + '/' + moduleConf.module + '/' + name + '.shtml');
              publishFiles.push(deployOptions.shtmlPrefix + '/' + moduleConf.module + '/' + name + '_js.shtml');
            }
          });
          globPages.push(path.join(dpath, 'css', '**'));
          globPages.push(path.join(dpath, 'js', '**'));
          if (Util.existsSync(imagesPath)) {
            var publishImages = fs.readdirSync(imagesPath);
            if (publishImages && publishImages.sort && !noImage) {
              globPages.push(path.join(imagesPath, '**'));
            }
          }
          // 使用http进行上传
          if (deployParams.mode === 'http') {
            vfs.src(globPages.concat(htmlPathList), { base: path.join(modulePath, 'dist', 'output') })
              .pipe($.if(isShowAll ? true : false, through2.obj(function (file, encoding, cb) {
                if (file.isDirectory()) {
                  return cb();
                }
                generatePublishFiles(file, deployOptions, publishFiles);
                this.push(file);
                cb();
              })))
              .pipe(athenaMate.publishFilter({
                cwd: appPath,
                app: appConf.app,
                module: moduleConf.module,
                remote: remoteName
              }))
              .pipe(through2.obj(function (file, encoding, cb) {
                if (file.isDirectory()) {
                  return cb();
                }
                generatePublishFiles(file, deployOptions, publishFiles);
                this.push(file);
                cb();
              }))
              .pipe(athenaMate.jdcFinder({
                erpid: deployRemoteParams.user,
                jfsToken: deployRemoteParams.pass,
                remotePath: deployRemoteParams.remotePath
              }))
              .pipe($.util.noop())
              .on('data', function () {})
              .on('end', function () {
                vfs.src(combofileSHtmlList)
                  .pipe($.if(useShtml, athenaMate.jdcFinder({
                    erpid: deployCssiParams.user,
                    jfsToken: deployCssiParams.pass,
                    remotePath: deployCssiParams.remotePath
                  })))
                  .pipe($.util.noop())
                  .on('data', function () {})
                  .on('end', function () {
                    vfs.src(summaryPage, { base: path.join(appPath, '.temp', appConf.app) })
                      .pipe(athenaMate.jdcFinder({
                        erpid: deployRemoteParams.user,
                        jfsToken: deployRemoteParams.pass,
                        remotePath: deployOptions.remotePath
                      }))
                      .pipe($.util.noop())
                      .on('data', function () {})
                      .on('end', function () {
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
              .pipe($.if(isShowAll ? true : false, through2.obj(function (file, encoding, cb) {
                if (file.isDirectory()) {
                  return cb();
                }
                generatePublishFiles(file, deployOptions, publishFiles);
                this.push(file);
                cb();
              })))
              .pipe(athenaMate.publishFilter({
                cwd: appPath,
                app: appConf.app,
                module: moduleConf.module,
                remote: remoteName
              }))
              .pipe(through2.obj(function (file, encoding, cb) {
                if (file.isDirectory()) {
                  return cb();
                }
                generatePublishFiles(file, deployOptions, publishFiles);
                this.push(file);
                cb();
              }))
              .pipe(athenaMate.ftp(deployRemoteParams))
              .on('data', function () {})
              .pipe($.util.noop())
              .on('finish', function () {
                vfs.src(combofileSHtmlList)
                  .pipe($.if(useShtml, athenaMate.ftp(deployCssiParams)))
                  .on('data', function () {})
                  .pipe($.util.noop())
                  .on('finish', function () {
                    vfs.src(summaryPage, { base: path.join(appPath, '.temp', appConf.app) })
                      .pipe(athenaMate.ftp(_.assign(_.clone(deployParams), {
                        remotePath: deployOptions.remotePath
                      })))
                      .on('data', function () {})
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
              .pipe($.if(isShowAll ? true : false, through2.obj(function (file, encoding, cb) {
                if (file.isDirectory()) {
                  return cb();
                }
                generatePublishFiles(file, deployOptions, publishFiles);
                this.push(file);
                cb();
              })))
              .pipe(athenaMate.publishFilter({
                cwd: appPath,
                app: appConf.app,
                module: moduleConf.module,
                remote: remoteName
              }))
              .pipe(through2.obj(function (file, encoding, cb) {
                if (file.isDirectory()) {
                  return cb();
                }
                generatePublishFiles(file, deployOptions, publishFiles);
                this.push(file);
                cb();
              }))
              .pipe(gulpSSH.dest(deployRemoteParams.remotePath))
              .on('finish', function () {
                vfs.src(combofileSHtmlList)
                  .pipe($.if(useShtml, gulpSSH.dest(deployCssiParams.remotePath)))
                  .on('finish', function () {
                    vfs.src(summaryPage, { base: path.join(appPath, '.temp', appConf.app) })
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
      }
    });
  };
};
