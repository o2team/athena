/**
* @fileoverview server模式，代码发布
* @author  liweitao@jd.com
*/

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
      var through2 = require('through2');
      var athenaMate = require('../athena_mate');
      var Util = require('../../util');

      var noImage = args ? args.noImage : false;
      var deploy = appConf.deploy;
      var readOutput = fs.readdirSync(path.join(modulePath, 'dist', 'output', 'tpl'));
      var pages = [];
      var mapJson = JSON.parse(String(fs.readFileSync(path.join(modulePath, 'dist', 'map.json'))));
      var pagesInclude = mapJson.include;
      var rev = mapJson.rev;

      var allPages = [];
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
        var summaryPage = path.join(appPath, '.temp', appConf.app, 'index.html');

        if (answers.pages) {
          var filterPages = [];
          answers.pages.forEach(function (item) {
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
          var imagesPath = path.join(dpath, 's', 'images');
          filterPages.forEach(function (item) {
            var name = path.basename(item, path.extname(item));
            var htmlPath = path.join(dpath, 'tpl', item);
            // 获取页面所引用的资源
            var pageInclude = pagesInclude[item];

            htmlPathList.push(htmlPath);
            if (!pageInclude) {
              $.util.log('页面' + $.util.colors.red(item) + '无引用资源，太奇怪了~');
            }
            if (_.isArray(pageInclude['css'])) {
              pageInclude['css'].forEach(function (item) {
                var name = item.name;
                if (name && item.module === moduleConf.module) {
                  globPages.push(path.join(dpath, 's', name));
                  if (rev && rev['css'] && rev['css'][name]) {
                    globPages.push(path.join(dpath, 's', rev['css'][name]));
                  }
                }
              });
            }
            if (_.isArray(pageInclude['js'])) {
              pageInclude['js'].forEach(function (item) {
                var name = item.name;
                if (name && item.module === moduleConf.module) {
                  globPages.push(path.join(dpath, 's', name));
                  if (rev && rev['js'] && rev['js'][name]) {
                    globPages.push(path.join(dpath, 's', rev['js'][name]));
                  }
                }
              });
            }
          });
          if (Util.existsSync(imagesPath)) {
            var publishImages = fs.readdirSync(imagesPath);
            if (publishImages && publishImages.sort && !noImage) {
              globPages.push(path.join(imagesPath, '**'));
            }
          }

          // 使用http进行上传
          if (deployParams.mode === 'http') {
            vfs.src(htmlPathList, { base: path.join(modulePath, 'dist', 'output', 'tpl') })
              .pipe(athenaMate.jdcFinder({
                erpid: deployRemoteParams.user,
                jfsToken: deployRemoteParams.pass,
                remotePath: deployRemoteParams.remotePath
              }))
              .pipe($.util.noop())
              .on('data', function () {})
              .on('end', function () {
                vfs.src(globPages, { base: path.join(modulePath, 'dist', 'output', 's') })
                  .pipe(athenaMate.publishFilter({
                    cwd: appPath,
                    app: appConf.app,
                    module: moduleConf.module,
                    remote: remoteName
                  }))
                  .pipe(through2.obj(function (file, encoding, cb) {
                    var name = path.basename(file.path);
                    var ext = path.extname(name);
                    if (Util.regexps.js.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/js/' + name);
                    } else if (Util.regexps.css.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/css/' + name);
                    } else if (Util.regexps.media.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/images/' + name);
                    } else if (Util.regexps.tpl.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/' + name);
                    }
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
            vfs.src(htmlPathList, { base: path.join(modulePath, 'dist', 'output', 'tpl') })
              .pipe(athenaMate.ftp(deployRemoteParams))
              .on('data', function () {})
              .pipe($.util.noop())
              .on('finish', function () {
                vfs.src(globPages, { base: path.join(modulePath, 'dist', 'output', 's') })
                  .pipe(athenaMate.publishFilter({
                    cwd: appPath,
                    app: appConf.app,
                    module: moduleConf.module,
                    remote: remoteName
                  }))
                  .pipe(through2.obj(function (file, encoding, cb) {
                    var name = path.basename(file.path);
                    var ext = path.extname(name);
                    if (Util.regexps.js.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/js/' + name);
                    } else if (Util.regexps.css.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/css/' + name);
                    } else if (Util.regexps.media.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/images/' + name);
                    } else if (Util.regexps.tpl.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/' + name);
                    }
                    this.push(file);
                    cb();
                  }))
                  .pipe(athenaMate.ftp(deployRemoteParams))
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
            vfs.src(htmlPathList, { base: path.join(modulePath, 'dist', 'output', 'tpl') })
              .pipe(gulpSSH.dest(deployRemoteParams.remotePath))
              .on('finish', function () {
                vfs.src(globPages, { base: path.join(modulePath, 'dist', 'output', 's') })
                  .pipe(athenaMate.publishFilterServer({
                    cwd: appPath,
                    app: appConf.app,
                    module: moduleConf.module,
                    remote: remoteName
                  }))
                  .pipe(through2.obj(function (file, encoding, cb) {
                    var name = path.basename(file.path);
                    var ext = path.extname(name);
                    if (Util.regexps.js.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/js/' + name);
                    } else if (Util.regexps.css.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/css/' + name);
                    } else if (Util.regexps.media.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/images/' + name);
                    } else if (Util.regexps.tpl.test(ext)) {
                      publishFiles.push(deployOptions.assestPrefix + '/' + moduleConf.module + '/' + name);
                    }
                    this.push(file);
                    cb();
                  }))
                  .pipe(gulpSSH.dest(deployRemoteParams.remotePath))
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
      });
    });
  };
};
