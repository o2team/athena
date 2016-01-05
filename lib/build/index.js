'use strict'

var fs = require('fs');
var path = require('path');
var $ = require('gulp-load-plugins')({lazy: true});
var requireDir = require('require-dir');
var vfs = require('vinyl-fs');
var browserSync = require('browser-sync');
var del = require('del');
var _ = require('lodash');
var gutil = require('gulp-util');

const BUILD_MODULE = 'module';
const BUILD_APP = 'app';
const BUILD_NONE = 'none';

var rootPath = process.cwd();

// 获取一些配置信息
function getConf (app, mod) {
  var appConf = null;
  var moduleConf = null;
  var buildType = '';

  app = app ? app : '';
  mod = (mod && typeof mod === 'string') ? mod : '';

  var appPath = path.join(rootPath, app);
  var appConfPath = path.join(appPath, 'app-conf.js');
  var modulePath = path.join(rootPath, app, mod);
  var moduleConfPath = path.join(modulePath, 'module-conf.js');

  if (fs.existsSync('app-conf.js')) {
    appPath = rootPath;
    appConfPath = path.join(appPath, 'app-conf.js');
  }

  if (fs.existsSync('module-conf.js')) {
    modulePath = rootPath;
    moduleConfPath = path.join(modulePath, 'module-conf.js');
  }

  if (fs.existsSync(appConfPath)) {
    appConf = require(appConfPath);
    if (mod && mod.length > 0) {
      modulePath = path.join(appPath, mod);
      moduleConf = require(path.join(modulePath, 'module-conf'));
    }
    buildType = BUILD_APP;
  } else if (fs.existsSync(moduleConfPath)) {
    moduleConf = require(moduleConfPath);
    appPath = path.resolve(modulePath, '..');
    appConfPath = path.join(appPath, 'app-conf.js');
    appConf = require(appConfPath);
    buildType = BUILD_MODULE;
  } else {
    appPath = null;
    modulePath = null;
    buildType = BUILD_NONE;
  }

  return {
    appConf: appConf,
    moduleConf: moduleConf,
    buildType: buildType,
    appPath: appPath,
    modulePath: modulePath
  };
}

function getModuleInfoViaPath (fPath, appName) {
  var folderNames = path.dirname(fPath).split(path.sep);
  var appIndex = folderNames.lastIndexOf(appName);
  if (!appIndex) {
    return null;
  }
  var moduleFolder = folderNames[appIndex + 1];
  return moduleFolder;
}

// 任务列表
var taskList = requireDir('./tasks');

// 编译单个模块
function buildSingleModule (app, mod, conf, args) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(app, mod);
  del.sync(path.join(conf.modulePath, 'dist'));
  var allPromise = taskList.all($, conf.appConf, conf.moduleConf, args);
  var athenaMatePromise = taskList.athena_mate($, conf.appConf, conf.moduleConf, args);
  var sassPromise = taskList.sass($, conf.appConf, conf.moduleConf, args);
  var lessPromise = taskList.less($, conf.appConf, conf.moduleConf, args);
  var csslintPromise = taskList.csslint($, conf.appConf, conf.moduleConf, args);
  var jshintPromise = taskList.jshint($, conf.appConf, conf.moduleConf, args);
  var stylesPromise = taskList.styles($, conf.appConf, conf.moduleConf, args);
  var scriptsPromise = taskList.scripts($, conf.appConf, conf.moduleConf, args);
  var fontsPromise = taskList.fonts($, conf.appConf, conf.moduleConf, args);
  var imagesPromise = taskList.images($, conf.appConf, conf.moduleConf, args);
  var revPromise = taskList.rev($, conf.appConf, conf.moduleConf, args);
  var injectPromise = taskList.inject($, conf.appConf, conf.moduleConf, args);
  var tempPromise = taskList.temp($, conf.appConf, conf.moduleConf, args);
  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(sassPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(lessPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(csslintPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(jshintPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(athenaMatePromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(imagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(scriptsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(fontsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(revPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(injectPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tempPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function (result) {
      $.util.log($.util.colors.green('结束编译模块' + mod + '！'));
      return Promise.resolve(result);
    }).catch(function (e) {
      if (e) {
        console.log(e.plugin);
        if (e.stack) {
          console.log(e.stack);
        }
      }
    });
}

function buildSingleModuleSimple (app, mod, conf, args) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(app, mod);
  del.sync(path.join(conf.modulePath, 'dist'));
  var allPromise = taskList.all($, conf.appConf, conf.moduleConf, args);
  var athenaMatePromise = taskList.athena_mate($, conf.appConf, conf.moduleConf, args);
  var sassPromise = taskList.sass($, conf.appConf, conf.moduleConf, args);
  var lessPromise = taskList.less($, conf.appConf, conf.moduleConf, args);
  var stylesPromise = taskList.styles($, conf.appConf, conf.moduleConf, args);
  var scriptsPromise = taskList.scripts($, conf.appConf, conf.moduleConf, args);
  var serveTransPromise = taskList.serve_trans($, conf.appConf, conf.moduleConf, args);
  var injectPromise = taskList.inject($, conf.appConf, conf.moduleConf, args);
  var tempPromise = taskList.temp($, conf.appConf, conf.moduleConf, args);

  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(sassPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(lessPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(athenaMatePromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(scriptsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(serveTransPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(injectPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tempPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function () {
      $.util.log($.util.colors.green('结束编译模块' + mod + '！'));
      return Promise.resolve(mod);
    }).catch(function (e) {
      if (e) {
        console.log(e.plugin);
        if (e.stack) {
          console.log(e.stack);
        }
      }
    });
}

// 编译
function build (app, mod, args) {
  var conf = getConf(app, mod);
  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可编译的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }
  args = args || {};
  // 如果编译项目没有指定模块，则顺序编译项目中每一个模块
  if (conf.buildType === BUILD_APP) {
    var moduleList = [];
    if (mod) {
      moduleList = mod;
    } else {
      moduleList = conf.appConf.moduleList;
      $.util.log($.util.colors.yellow('Allo Allo! Begin to build app ' + conf.appConf.app + '!'));
    }

    var promsies = [];
    for (var i = 0; i < moduleList.length; i ++) {
      del.sync(path.join(conf.appPath, '.temp', moduleList[i]));
      promsies[i] = i;
    }

    return promsies.reduce(function (prev, curr) {
      return prev.then(function (val) {
        if (args.isSimple) {
          return buildSingleModuleSimple(app, moduleList[curr], conf, args);
        }
        return buildSingleModule(app, moduleList[curr], conf, args);
      });
    }, Promise.resolve('start')).catch(function (e) {
      if (e) {
        console.log(e.plugin);
        if (e.stack) {
          console.log(e.stack);
        }
      }
    });
  } else if (conf.buildType === BUILD_MODULE) {
    if (args.isSimple) {
      return buildSingleModuleSimple(app, mod, conf, args);
    }
    return buildSingleModule(app, mod, conf, args);
  }
}

// 预览
function serve(app, mod, args) {
  var conf = getConf(app, mod);

  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可供预览的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }
  args = args || {};
  var isDist = args.dist ? args.dist : false;
  if (conf.buildType === BUILD_APP) {
    build(app, mod, _.assign({ isSimple: !isDist }, args)).then(function () {
      var page = args ? args.page : undefined;
      var tempFolder = path.join(conf.appPath, '.temp');
      var serverParam = {
        baseDir: tempFolder
      };

      if (page && mod) {
        serverParam.baseDir = [tempFolder, path.join(tempFolder, mod)];
        serverParam.index = path.join(tempFolder, mod, page + '.html');
      }
      browserSync({
        notify: false,
        port: 3001,
        server: serverParam
      });

      var moduleList = mod ? mod : conf.appConf.moduleList;

      var moduleInfoList = moduleList.map(function (item) {
        var dependency = null;
        var mapJsonPath = path.join(conf.appPath, item, 'dist', 'map.json');
        var staticConfPath = path.join(conf.appPath, item, 'static-conf.js');
        var staticConf = require(staticConfPath);
        var mapJson = null;
        if (fs.existsSync(mapJsonPath)) {
          mapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
          dependency = mapJson.dependency;
        }
        var modulePath = path.join(conf.appPath, item);
        return {
          module: item,
          modulePath: modulePath,
          moduleConf: require(path.join(modulePath, 'module-conf')),
          dependency: dependency,
          staticConf: staticConf
        };
      });

      // 监听不同类型文件的改变
      // 监听page的html文件变动
      vfs.watch([
        '*/page/**/*.html'
      ], function (ev) {
        browserSync.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = getModuleInfoViaPath(fPath, conf.appConf.app);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var args = { pageFiles: [fPath], type: ev.type };
        var servePagePromise = taskList.serve_page($, conf.appConf, moduleConf, args);
        servePagePromise(mod, modulePath, conf.appPath)
          .then(function () {
            browserSync.reload();
          });
      });

      // 监听widget的html文件变动
      vfs.watch([
        '*/widget/**/*.html'
      ], function (ev) {
        browserSync.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var dirname = path.dirname(fPath);
        var dirnameArr = dirname.split(path.sep);
        var widgetIndex = dirnameArr.indexOf('widget');
        var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
        var serveTaskList = moduleInfoList.map(function (item) {
          var pages = [];
          if (item.dependency) {
            for (var i in item.dependency) {
              for (var j in item.dependency[i]) {
                if (item.dependency[i][j].widgetName === widgetName) {
                  pages.push(path.join(conf.appPath, item.module, 'page', path.basename(i, path.extname(i)), i));
                  break;
                }
              }
            }
          }
          if (pages.length > 0) {
            var args = { pageFiles: pages, type: ev.type };
            var copyFilePromise = taskList.copy_file($, conf.appConf, item.moduleConf, {
              src: fPath,
              dest: path.join(item.modulePath, 'dist', '_', 'widget', widgetName)
            });
            var servePagePromise = taskList.serve_page($, conf.appConf, item.moduleConf, args);
            return {
              copyFile: copyFilePromise.bind(null, mod, item.modulePath, conf.appPath),
              servePage: servePagePromise.bind(null, mod, item.modulePath, conf.appPath)
            };
          }
        });
        serveTaskList = serveTaskList.filter(function (item) {
          if (item) {
            return item;
          }
        });
        serveTaskList.reduce(function (prev, curr, index) {
          var p;
          if (curr) {
            p = curr.copyFile().then(curr.servePage);
          }
          return p;
        }, Promise.resolve('start'))
          .then(function () {
            browserSync.reload();
          })
          .catch(function (e) {
            if (e) {
              console.log(e.plugin);
              if (e.stack) {
                console.log(e.stack);
              }
            }
          });
      });

      // 监听page的sass/less/css/js文件的变动
      vfs.watch([
        '*/page/**/*.?(css|sass|scss|less|js)'
      ], function (ev) {
        browserSync.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = getModuleInfoViaPath(fPath, conf.appConf.app);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var fileName = path.basename(fPath);
        var dirname = path.dirname(fPath);
        var dirnameArr = dirname.split(path.sep);
        var pageIndex = dirnameArr.indexOf('page');
        var pageName = dirnameArr.splice(pageIndex + 1, 1)[0];
        var pageFile = path.join(modulePath, 'page', pageName, pageName + '.html');
        var fileDest = path.join(modulePath, 'dist', '_', 'page', pageName);

        var args = {};
        var copyFilePromise = taskList.copy_file($, conf.appConf, moduleConf, {
          src: fPath,
          dest: fileDest
        });
        var p = null;
        if (/\.js/.test(path.extname(fPath))) {
          args = { pageFiles: [pageFile]};
          p = taskList.serve_js($, conf.appConf, moduleConf, args);
        } else {
          args = { pageFiles: [pageFile], cssFile: path.join(fileDest, fileName), fileDest: fileDest };
          p = taskList.serve_css($, conf.appConf, moduleConf, args);
        }

        copyFilePromise(mod, modulePath, conf.appPath)
          .then(p.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            browserSync.reload();
          });
      });

      // 监听widget的sass/less/css/js文件的变动
      vfs.watch([
        '*/widget/**/*.?(css|sass|scss|less|js)'
      ], function (ev) {
        browserSync.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var fileName = path.basename(fPath);
        var dirname = path.dirname(fPath);
        var dirnameArr = dirname.split(path.sep);
        var widgetIndex = dirnameArr.indexOf('widget');
        var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
        var moduleFolder = getModuleInfoViaPath(fPath, conf.appConf.app);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var mapJsonPath = path.join(modulePath, 'dist', 'map.json');
        var mapJson = null;
        var dependency = null;
        if (fs.existsSync(mapJsonPath)) {
          mapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
          dependency = mapJson.dependency;
        }
        var pages = [];
        if (dependency) {
          for (var i in dependency) {
            for (var j in dependency[i]) {
              if (dependency[i][j].widgetName === widgetName) {
                pages.push(path.join(modulePath, 'page', path.basename(i, path.extname(i)), i));
                break;
              }
            }
          }
        }
        var fileDest = path.join(modulePath, 'dist', '_', 'widget', widgetName);
        var args = {};
        var copyFilePromise = taskList.copy_file($, conf.appConf, moduleConf, {
          src: fPath,
          dest: fileDest
        });
        var p = null;
        if (/\.js/.test(path.extname(fPath))) {
          args = { pageFiles: pages, cssFile: path.join(fileDest, fileName) };
          p = taskList.serve_js($, conf.appConf, moduleConf, args);
        } else {
          args = { pageFiles: pages, cssFile: path.join(fileDest, fileName), fileDest: fileDest };
          p = taskList.serve_css($, conf.appConf, moduleConf, args);
        }

        copyFilePromise(mod, modulePath, conf.appPath)
          .then(p.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            browserSync.reload();
          }).catch(function (e) {
            console.log(e);
          });
      });

      // 监听所有图片文件的变动
      vfs.watch([
        '*/page/**/images/**',
        '*/static/**/images/**',
        '*/widget/**/images/**'
      ], function (ev) {
        browserSync.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = getModuleInfoViaPath(fPath, conf.appConf.app);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var fileTransfer = path.join(modulePath, 'dist', 'output', 'images');
        var fileDest = path.join(conf.appPath, '.temp', moduleFolder, 'images');
        if (ev.type === 'deleted') {
          var appInnerPath = fPath.replace(conf.appPath, '');
          var appInnerPathArr = appInnerPath.split(path.sep);
          var imagesIndex = appInnerPathArr.indexOf('images');
          var imagesPath = appInnerPathArr.splice(imagesIndex + 1).join(path.sep);
          del.sync(path.join(fileTransfer, imagesPath));
          del.sync(path.join(fileDest, imagesPath));
          browserSync.reload();
        } else {
          var copyTransPromise = taskList.copy_file($, conf.appConf, moduleConf, {
            src: fPath,
            dest: fileTransfer
          });
          var copyFilePromise = taskList.copy_file($, conf.appConf, moduleConf, {
            src: fPath,
            dest: fileDest
          });
          copyTransPromise(mod, modulePath, conf.appPath)
            .then(copyFilePromise.bind(null, mod, modulePath, conf.appPath))
            .then(function () {
              browserSync.reload();
            });
        }
      });

      // 修改static目录下的sass/less/css/js文件，暂时做重新编译整个模块处理
      vfs.watch([
        '*/static/**/*.?(css|sass|scss|less|js)'
      ], function (ev) {
        browserSync.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = getModuleInfoViaPath(fPath, conf.appConf.app);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var staticConfPath = path.join(modulePath, 'static-conf.js');
        var staticConf = require(staticConfPath);
        if (staticConf && !_.isEmpty(staticConf.staticPath)) {
          buildSingleModuleSimple(app, moduleFolder, conf, args).then(function () {
            browserSync.reload();
          });
        }
      });
    });
  } else if (conf.buildType === BUILD_MODULE) {
    if (!mod) {
      mod = conf.moduleConf.module;
    }
    del.sync(path.join(conf.appPath, '.temp', mod), { force: true });
    var servePromise = taskList.serve($, conf.appConf, conf.moduleConf, args);
    var buildModuleFunction = isDist ? buildSingleModule : buildSingleModuleSimple;
    buildModuleFunction(app, mod, conf, args)
      .then(servePromise.bind(null, mod, conf.modulePath, conf.appPath))
      .then(function () {
        var dependency = null;
        var mapJsonPath = path.join(conf.modulePath, 'dist', 'map.json');
        var mapJson = null;
        var staticConfPath = path.join(conf.modulePath, 'static-conf.js');
        var staticConf = require(staticConfPath);
        if (fs.existsSync(mapJsonPath)) {
          mapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
          dependency = mapJson.dependency;
        }
        // 监听page的html文件变动
        vfs.watch([
          'page/**/*.html'
        ], function (ev) {
          browserSync.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var args = { pageFiles: [fPath], type: ev.type };
          var servePagePromise = taskList.serve_page($, conf.appConf, conf.moduleConf, args);
          servePagePromise(mod, conf.modulePath, conf.appPath)
            .then(function () {
              browserSync.reload();
            });
        });

        // 监听widget的html文件变动
        vfs.watch([
          'widget/**/*.html'
        ], function (ev) {
          browserSync.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var dirname = path.dirname(fPath);
          var dirnameArr = dirname.split(path.sep);
          var widgetIndex = dirnameArr.indexOf('widget');
          var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
          var pages = [];
          if (dependency) {
            for (var i in dependency) {
              for (var j in dependency[i]) {
                if (dependency[i][j].widgetName === widgetName) {
                  pages.push(path.join(conf.modulePath, 'page', path.basename(i, path.extname(i)), i));
                  break;
                }
              }
            }
          }

          var args = { pageFiles: pages, type: ev.type };
          var copyFilePromise = taskList.copy_file($, conf.appConf, conf.moduleConf, {
            src: fPath,
            dest: path.join(conf.modulePath, 'dist', '_', 'widget', widgetName)
          });
          var servePagePromise = taskList.serve_page($, conf.appConf, conf.moduleConf, args);
          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(servePagePromise.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              browserSync.reload();
            });
        });

        // 监听page的sass/less/css/js文件的变动
        vfs.watch([
          'page/**/*.?(css|sass|scss|less|js)'
        ], function (ev) {
          browserSync.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var fileName = path.basename(fPath);
          var dirname = path.dirname(fPath);
          var dirnameArr = dirname.split(path.sep);
          var pageIndex = dirnameArr.indexOf('page');
          var pageName = dirnameArr.splice(pageIndex + 1, 1)[0];
          var pageFile = path.join(conf.modulePath, 'page', pageName, pageName + '.html');
          var fileDest = path.join(conf.modulePath, 'dist', '_', 'page', pageName);

          var args = {};
          var copyFilePromise = taskList.copy_file($, conf.appConf, conf.moduleConf, {
            src: fPath,
            dest: fileDest
          });
          var p = null;
          if (/\.js/.test(path.extname(fPath))) {
            args = { pageFiles: [pageFile]};
            p = taskList.serve_js($, conf.appConf, conf.moduleConf, args);
          } else {
            args = { pageFiles: [pageFile], cssFile: path.join(fileDest, fileName), fileDest: fileDest };
            p = taskList.serve_css($, conf.appConf, conf.moduleConf, args);
          }

          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(p.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              browserSync.reload();
            });
        });

        // 监听widget的sass/less/css/js文件的变动
        vfs.watch([
          'widget/**/*.?(css|sass|scss|less|js)'
        ], function (ev) {
          browserSync.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var fileName = path.basename(fPath);
          var dirname = path.dirname(fPath);
          var dirnameArr = dirname.split(path.sep);
          var widgetIndex = dirnameArr.indexOf('widget');
          var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
          var pages = [];
          if (dependency) {
            for (var i in dependency) {
              for (var j in dependency[i]) {
                if (dependency[i][j].widgetName === widgetName) {
                  pages.push(path.join(conf.modulePath, 'page', path.basename(i, path.extname(i)), i));
                  break;
                }
              }
            }
          }
          var fileDest = path.join(conf.modulePath, 'dist', '_', 'widget', widgetName);
          var args = {};
          var copyFilePromise = taskList.copy_file($, conf.appConf, conf.moduleConf, {
            src: fPath,
            dest: fileDest
          });
          var p = null;
          if (/\.js/.test(path.extname(fPath))) {
            args = { pageFiles: pages, cssFile: path.join(fileDest, fileName) };
            p = taskList.serve_js($, conf.appConf, conf.moduleConf, args);
          } else {
            args = { pageFiles: pages, cssFile: path.join(fileDest, fileName), fileDest: fileDest };
            p = taskList.serve_css($, conf.appConf, conf.moduleConf, args);
          }

          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(p.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              browserSync.reload();
            });
        });

        // 监听所有图片文件的变动
        vfs.watch([
          'page/**/images/**',
          'static/**/images/**',
          'widget/**/images/**'
        ], function (ev) {
          browserSync.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var fileDest = path.join(conf.appPath, '.temp', mod, 'images');
          var fileTransfer = path.join(conf.modulePath, 'dist', 'output', 'images');
          if (ev.type === 'deleted') {
            var moduleInnerPath = fPath.replace(conf.modulePath, '');
            var moduleInnerPathArr = moduleInnerPath.split(path.sep);
            var imagesIndex = moduleInnerPathArr.indexOf('images');
            var imagesPath = moduleInnerPathArr.splice(imagesIndex + 1).join(path.sep);
            del.sync(path.join(fileTransfer, imagesPath));
            del.sync(path.join(fileDest, imagesPath), { force: true });
            browserSync.reload();
          } else {
            var copyTransPromise = taskList.copy_file($, conf.appConf, conf.moduleConf, {
              src: fPath,
              dest: fileTransfer
            });
            var copyFilePromise = taskList.copy_file($, conf.appConf, conf.moduleConf, {
              src: fPath,
              dest: fileDest
            });
            copyTransPromise(mod, conf.modulePath, conf.appPath)
              .then(copyFilePromise.bind(null, mod, conf.modulePath, conf.appPath))
              .then(function () {
                browserSync.reload();
              });
          }
        });

        // 修改static目录下的sass/less/css/js文件，暂时做重新编译整个模块处理
        if (staticConf && !_.isEmpty(staticConf.staticPath)) {
          vfs.watch([
            'static/**/*.?(css|sass|scss|less|js)'
          ], function () {
            browserSync.notify('正在编译，请稍等！');
            buildSingleModuleSimple(app, mod, conf, args).then(function () {
              browserSync.reload();
            });
          });
        }
      });
  }
}

// 发布
function publish (app, mod, args) {
  var conf = getConf(app, mod);
  args = args || {};
  args = _.assign(args, { isPublish: true });
  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可以发布的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }

  if (conf.buildType === BUILD_APP) {
    var moduleList = [];
    if (mod) {
      moduleList = mod;
    } else {
      moduleList = conf.appConf.moduleList;
      $.util.log($.util.colors.yellow('Allo Allo! Begin to publish app ' + conf.appConf.app + '!'));
    }
    var promsies = [];
    var publishFiles = [];
    for (var i = 0; i < moduleList.length; i ++) {
      promsies[i] = i;
    }
    return promsies.reduce(function (prev, curr) {
      return prev.then(function (val) {
        conf = getConf(app, moduleList[curr]);
        var uploadPromise = taskList.upload($, conf.appConf, conf.moduleConf, args);
        var publishPromise = taskList.publish($, conf.appConf, conf.moduleConf, args);
        var modulePath = path.join(conf.appPath, moduleList[curr]);
        return buildSingleModule(app, moduleList[curr], conf, args)
          .then(uploadPromise.bind(null, moduleList[curr], modulePath, conf.appPath))
          .then(publishPromise.bind(null, moduleList[curr], modulePath, conf.appPath))
          .then(function (files) {
            publishFiles = publishFiles.concat(files);
          }).catch(function (e) {
            if (e) {
              console.log(e.plugin);
              if (e.stack) {
                console.log(e.stack);
              }
            }
          });
      });
    }, Promise.resolve('start'))
      .then(function () {
        return Promise.resolve({
          appConf: conf.appConf,
          files: publishFiles
        });
      }).catch(function (e) {
        if (e) {
          console.log(e.plugin);
          if (e.stack) {
            console.log(e.stack);
          }
        }
      });
  } else if (conf.buildType === BUILD_MODULE) {
    if (!mod) {
      mod = conf.moduleConf.module;
    }
    var uploadPromise = taskList.upload($, conf.appConf, conf.moduleConf, args);
    var publishPromise = taskList.publish($, conf.appConf, conf.moduleConf, args);
    return buildSingleModule(app, mod, conf, args)
      .then(uploadPromise.bind(null, mod, conf.modulePath, conf.appPath))
      .then(publishPromise.bind(null, mod, conf.modulePath, conf.appPath))
      .then(function (files) {
        return Promise.resolve({
          appConf: conf.appConf,
          files: files
        });
      }).catch(function (e) {
        if (e) {
          console.log(e.plugin);
          if (e.stack) {
            console.log(e.stack);
          }
        }
      });
  }
}

// 拷贝
function clone (widget, source, dest) {
  var conf = getConf(null, source);
  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('请在项目或模块目录下执行clone！'));
    return false;
  }
  dest = dest ? dest : '';
  if (conf.buildType === BUILD_APP) {
    if (!source || !dest) {
      $.util.log($.util.colors.red('在项目目录下执行clone需要带上--from参数和--to参数，表名来源和目的地！'));
      return false;
    }
  } else if (conf.buildType === BUILD_MODULE) {
    if (!source) {
      $.util.log($.util.colors.red('没有指定--form 来源，将直接从本模块复制！'));
      source = conf.moduleConf.module;
    }
    if (!dest) {
      dest = conf.moduleConf.module;
    }
  }
  var clonePromise = taskList.clone($, conf.appConf, conf.moduleConf);
  clonePromise(conf.modulePath, conf.appPath, widget, source, dest)
    .then(function () {

    }).catch(function (e) {
      if (e) {
        console.log(e.plugin);
        if (e.stack) {
          console.log(e.stack);
        }
      }
    });
}

module.exports = {
  build: build,
  serve: serve,
  publish: publish,
  clone: clone
};
