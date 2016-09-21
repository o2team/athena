/**
* @fileoverview 编译入口文件
* @author  liweitao
*/

'use strict';

var fs = require('fs');
var path = require('path');
var $ = require('gulp-load-plugins')({lazy: true});
var requireDir = require('require-dir');
var vfs = require('vinyl-fs');
var Maltose = require('maltose');
var del = require('del');
var _ = require('lodash');
var gutil = require('gulp-util');
var Util = require('../util');

/** 三种编译类型 **/
// 处于模块目录下进行编译
const BUILD_MODULE = 'module';
// 处于项目目录下进行编译
const BUILD_APP = 'app';
// 当前目录既不是模块目录，也不是项目目录
const BUILD_NONE = 'none';

var rootPath = process.cwd();

/**
 * 获取一些配置信息
 */
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

  if (Util.existsSync('app-conf.js')) {
    appPath = rootPath;
    appConfPath = path.join(appPath, 'app-conf.js');
  }

  if (Util.existsSync('module-conf.js')) {
    modulePath = rootPath;
    moduleConfPath = path.join(modulePath, 'module-conf.js');
  }

  if (Util.existsSync(appConfPath)) {
    appConf = require(appConfPath);
    if (mod && mod.length > 0) {
      modulePath = path.join(appPath, mod);
      moduleConfPath = path.join(modulePath, 'module-conf.js');
      if (Util.existsSync(moduleConfPath)) {
        moduleConf = require(moduleConfPath);
      } else {
        throw new Error('模块不存在');
      }
    }
    buildType = BUILD_APP;
  } else if (Util.existsSync(moduleConfPath)) {
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

// 任务列表
var taskList = requireDir('./tasks');

/**
 * 编译单个模块，客户端完全处理模式
 */
function buildSingleModule (app, mod, conf, args) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(app, mod);
  del.sync(path.join(conf.modulePath, 'dist'));
  var allPromise = taskList.all($, conf.appConf, conf.moduleConf, args);
  var sassPromise = taskList.sass($, conf.appConf, conf.moduleConf, args);
  var lessPromise = taskList.less($, conf.appConf, conf.moduleConf, args);
  var csslintPromise = taskList.csslint($, conf.appConf, conf.moduleConf, args);
  var jshintPromise = taskList.jshint($, conf.appConf, conf.moduleConf, args);
  var athenaMatePromise = taskList.athena_mate($, conf.appConf, conf.moduleConf, args);
  var transImagesPromise = taskList.trans_images($, conf.appConf, conf.moduleConf, args);
  var stylesPromise = taskList.styles($, conf.appConf, conf.moduleConf, args);
  var scriptsPromise = taskList.scripts($, conf.appConf, conf.moduleConf, args);
  var compressPromise = taskList.compress($, conf.appConf, conf.moduleConf, args);
  var fontsPromise = taskList.fonts($, conf.appConf, conf.moduleConf, args);
  var imagesPromise = taskList.images($, conf.appConf, conf.moduleConf, args);
  var revPromise = taskList.rev($, conf.appConf, conf.moduleConf, args);
  var revNoHashPromise = taskList.rev_no_hash($, conf.appConf, conf.moduleConf, args);
  var fetchCommonPromise = taskList.fetch_common($, conf.appConf, conf.moduleConf, args);
  var tempPromise = taskList.temp($, conf.appConf, conf.moduleConf, args);

  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(sassPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(lessPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(csslintPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(jshintPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(athenaMatePromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(transImagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(scriptsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(imagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(compressPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(fontsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function () {
      // 是否启用md5
      return new Promise(function (resolve, reject) {
        var support = conf.moduleConf.support;
        var useHash = support.useHash ? support.useHash : {
          enable: true
        };
        var enable = useHash.enable === undefined ? true : useHash.enable;
        if (enable) {
          resolve();
        } else {
          reject();
        }
      });
    })
    .then(revPromise.bind(null, mod, conf.modulePath, conf.appPath), revNoHashPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(fetchCommonPromise.bind(null, mod, conf.modulePath, conf.appPath))
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

/**
 * 编译单个模块，预览时专用，客户端完全处理模式
 */
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
  var transImagesPromise = taskList.trans_images($, conf.appConf, conf.moduleConf, args);
  var stylesPromise = taskList.styles($, conf.appConf, conf.moduleConf, args);
  var serveTransPromise = taskList.serve_trans($, conf.appConf, conf.moduleConf, args);
  var tempPromise = taskList.temp($, conf.appConf, conf.moduleConf, args);

  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(sassPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(lessPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(athenaMatePromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(transImagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(serveTransPromise.bind(null, mod, conf.modulePath, conf.appPath))
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

/**
 * 编译单个模块，客户端只处理完代码的编译工作，文件合并等操作放到服务端进行
 */
function buildSingleModuleServer (app, mod, conf, args) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(app, mod);
  del.sync(path.join(conf.modulePath, 'dist'));
  var allPromise = taskList.all($, conf.appConf, conf.moduleConf, args);
  var sassPromise = taskList.sass($, conf.appConf, conf.moduleConf, args);
  var lessPromise = taskList.less($, conf.appConf, conf.moduleConf, args);
  var csslintPromise = taskList.csslint($, conf.appConf, conf.moduleConf, args);
  var jshintPromise = taskList.jshint($, conf.appConf, conf.moduleConf, args);
  var tplGetPromise = taskList.tpl_get($, conf.appConf, conf.moduleConf, args);
  var transStaticPromise = taskList.trans_static($, conf.appConf, conf.moduleConf, args);
  var athenaMateServerPromise = taskList.athena_mate_server($, conf.appConf, conf.moduleConf, args);
  var transImagesPromise = taskList.trans_images($, conf.appConf, conf.moduleConf, args);
  var stylesServerPromise = taskList.styles_server($, conf.appConf, conf.moduleConf, args);
  var styleGetPromise = taskList.style_get($, conf.appConf, conf.moduleConf, args);
  var imagesPromise = taskList.images($, conf.appConf, conf.moduleConf, args);
  var compressCSSServerPromise = taskList.compress_css_server($, conf.appConf, conf.moduleConf, args);
  var compressJSServerPromise = taskList.compress_js_server($, conf.appConf, conf.moduleConf, args);
  var injectServerPromise = taskList.inject_server($, conf.appConf, conf.moduleConf, args);
  var revNoHashServerPromise = taskList.rev_no_hash_server($, conf.appConf, conf.moduleConf, args);
  var revServerPromise = taskList.rev_server($, conf.appConf, conf.moduleConf, args);
  var floorProcessPromise = taskList.floor_process($, conf.appConf, conf.moduleConf, args);
  var resourceConcatServerPromise = taskList.resource_concat_server($, conf.appConf, conf.moduleConf, args);
  var fetchCommonPromise = taskList.fetch_common($, conf.appConf, conf.moduleConf, args);
  var tempServerPromise = taskList.temp_server($, conf.appConf, conf.moduleConf, args);
  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(sassPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(lessPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(csslintPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(jshintPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tplGetPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(transStaticPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(athenaMateServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(transImagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(imagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(compressCSSServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(styleGetPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(compressJSServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(injectServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function () {
      // 是否启用md5
      return new Promise(function (resolve, reject) {
        var support = conf.moduleConf.support;
        var useHash = support.useHash ? support.useHash : {
          enable: true
        };
        var enable = useHash.enable === undefined ? true : useHash.enable;
        if (enable) {
          resolve();
        } else {
          reject();
        }
      });
    })
    .then(revServerPromise.bind(null, mod, conf.modulePath, conf.appPath), revNoHashServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(fetchCommonPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function () {
      if (args.release) {
        return floorProcessPromise(mod, conf.modulePath, conf.appPath);
      }
      return Promise.resolve();
    })
    .then(function () {
      if (args.allin) {
        return resourceConcatServerPromise(mod, conf.modulePath, conf.appPath);
      }
      return Promise.resolve();
    })
    .then(tempServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
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

/**
 * 编译单个模块，预览时专用，客户端只处理完代码的编译工作，文件合并等操作放到服务端进行
 */
function buildSingleModuleSimpleServer (app, mod, conf, args) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(app, mod);
  del.sync(path.join(conf.modulePath, 'dist'));
  var allPromise = taskList.all($, conf.appConf, conf.moduleConf, args);
  var sassPromise = taskList.sass($, conf.appConf, conf.moduleConf, args);
  var lessPromise = taskList.less($, conf.appConf, conf.moduleConf, args);
  var transStaticPromise = taskList.trans_static($, conf.appConf, conf.moduleConf, args);
  var athenaMateServerPromise = taskList.athena_mate_server($, conf.appConf, conf.moduleConf, args);
  var transImagesPromise = taskList.trans_images($, conf.appConf, conf.moduleConf, args);
  var stylesServerPromise = taskList.styles_server($, conf.appConf, conf.moduleConf, args);
  var injectServerPromise = taskList.inject_server($, conf.appConf, conf.moduleConf, args);
  var transOutputServerPromise = taskList.trans_output_server($, conf.appConf, conf.moduleConf, args);
  var tempServerPromise = taskList.temp_server($, conf.appConf, conf.moduleConf, args);
  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(sassPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(lessPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(transStaticPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(athenaMateServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(transImagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(injectServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(transOutputServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tempServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
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

/**
 * 编译
 */
function build (app, mod, args) {
  var conf = getConf(app, mod);
  args = args || {};
  var appConf = conf.appConf;
  var comboConf = (typeof appConf.comboConf === 'object') && !_.isEmpty(appConf.comboConf) ? appConf.comboConf : {
    mode: 'client'
  };
  if (args.isSimple) {
    if (comboConf.mode === 'client') {
      return buildCheck(app, mod, conf, args, buildSingleModuleSimple);
    }
    return buildCheck(app, mod, conf, args, buildSingleModuleSimpleServer);
  }
  if (comboConf.mode === 'client') {
    return buildCheck(app, mod, conf, args, buildSingleModule);
  }
  return buildCheck(app, mod, conf, args, buildSingleModuleServer);
}

function buildCheck (app, mod, conf, args, buildSingleFn) {
  var appConf = conf.appConf;
  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可编译的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }

  // 如果编译项目没有指定模块，则顺序编译项目中每一个模块
  if (conf.buildType === BUILD_APP) {
    var moduleList = [];
    if (mod) {
      moduleList = mod;
    } else {
      moduleList = appConf.moduleList;
      $.util.log($.util.colors.yellow('Allo Allo! Begin to build app ' + appConf.app + '!'));
    }

    var promsies = [];
    for (var i = 0; i < moduleList.length; i ++) {
      del.sync(path.join(conf.appPath, '.temp', appConf.app, moduleList[i]));
      promsies[i] = i;
    }
    var generateIncludePromise = taskList.generate_include($, appConf, conf.moduleConf, args);
    return promsies.reduce(function (prev, curr) {
      return prev.then(function (val) {
        return buildSingleFn(app, moduleList[curr], conf, args);
      });
    }, Promise.resolve('start'))
      .then(function () {
        if (args.pack || args.compress || args.release) {
          generateIncludePromise(mod, conf.modulePath, conf.appPath)
            .then(function () {
              var archiver = require('archiver');
              var archive = archiver('zip', {});
              var zipName = appConf.app + '.zip';
              var output = fs.createWriteStream(path.join(conf.appPath, zipName));
              output.on('close', function () {
                gutil.log(gutil.colors.green('打包完毕！文件在 ' + path.join(conf.appPath, zipName)));
              });
              archive.on('error', function(err){
                throw err;
              });
              archive.pipe(output);
              archive.bulk([
                {
                  expand: true,
                  cwd: path.join(conf.appPath, '.temp'),
                  src: ['**/*']
                }
              ]);
              archive.finalize();
            });
        }
      }).catch(function (e) {
        if (e) {
          console.log(e.plugin);
          if (e.stack) {
            console.log(e.stack);
          }
        }
      });
  } else if (conf.buildType === BUILD_MODULE) {
    del.sync(path.join(conf.appPath, '.temp', appConf.app, conf.moduleConf.module), { force: true });
    return buildSingleFn(app, mod, conf, args);
  }
}

/**
 * 预览
 */
function serve(app, mod, args) {
  var conf = getConf(app, mod);

  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可供预览的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }
  args = args || {};
  var appConf = conf.appConf;
  var comboConf = typeof appConf.comboConf === 'object' ? appConf.comboConf : {
    mode: 'client'
  };
  var isDist = args.dist ? args.dist : false;
  args = _.assign(args, { isServe: isDist ? false : true });
  if (comboConf.mode === 'client') {
    serveClient(conf, app, mod, args)
      .catch(function (e) {
        console.log(e.stack);
      });
  } else {
    serveServer(conf, app, mod, args)
      .catch(function (e) {
        console.log(e.stack);
      });
  }
}

/**
 * client模式预览
 */
function serveClient (conf, app, mod, args) {
  var isDist = args.dist ? args.dist : false;
  var appConf = conf.appConf;
  if (conf.buildType === BUILD_APP) {
    return build(app, mod, _.assign({ isSimple: !isDist }, args)).then(function () {
      var page = args ? args.page : undefined;
      var tempFolder = path.join(conf.appPath, '.temp');
      var serverParam = {
        baseDir: tempFolder,
        shortPath: appConf.app
      };

      if (page && mod) {
        if (_.isArray(mod)) {
          if (mod.length > 1) {
            gutil.log(gutil.colors.yellow('输入了多个模块，只取最后一个！'));
          }
          mod = mod[mod.length - 1];
        }
        serverParam.baseDir = tempFolder;
        serverParam.touchIndex = mod + '/' + page + '.html';
      }
      var silence = args.silence ? args.silence : false;
      var maltose = new Maltose({
        port: 35729,
        server: serverParam,
        silence: silence
      });
      maltose.serve();

      var moduleList = mod ? mod : appConf.moduleList;

      // 监听不同类型文件的改变
      // 监听page的html文件变动
      vfs.watch([
        '*/page/**/*.html'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleInnerPath = fPath.replace(modulePath, '');
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var pageIndex = dirnameArr.indexOf('page');
        var pageName = dirnameArr.splice(pageIndex + 1, 1)[0];
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var args = { pageFiles: [fPath], type: ev.type };
        var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
          src: fPath,
          dest: path.join(modulePath, 'dist', '_', 'page', pageName)
        });
        var servePagePromise = taskList.serve_page($, appConf, moduleConf, args);
        copyFilePromise(mod, modulePath, conf.appPath)
          .then(servePagePromise.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(fPath))]);
          });
      });

      // 监听widget的html文件变动
      vfs.watch([
        '*/widget/**/*.html'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleInnerPath = fPath.replace(modulePath, '');
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var widgetIndex = dirnameArr.indexOf('widget');
        var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
        var currentUrl = maltose.getCurrentUrl() || '';
        var mods = [];
        if (moduleFolder !== appConf.common) {
          mods = [moduleFolder];
        } else {
          mods = moduleList;
        }
        var moduleInfoList = mods.map(function (item) {
          var dependency = null;
          var mapJsonPath = path.join(conf.appPath, item, 'dist', 'map.json');
          var staticConfPath = path.join(conf.appPath, item, 'static-conf.js');
          var staticConf = require(staticConfPath);
          var mapJson = null;
          if (Util.existsSync(mapJsonPath)) {
            mapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
            dependency = mapJson.dependency;
          }
          var modPath = path.join(conf.appPath, item);
          return {
            module: item,
            modulePath: modPath,
            moduleConf: require(path.join(modPath, 'module-conf')),
            dependency: dependency,
            staticConf: staticConf
          };
        });
        var copyFilePromise = taskList.copy_file($, appConf, require(path.join(modulePath, 'module-conf')), {
          src: fPath,
          dest: path.join(modulePath, 'dist', '_', 'widget', widgetName)
        });
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
            var servePagePromise = taskList.serve_page($, appConf, item.moduleConf, args);
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
            p = curr.copyFile().then(curr.servePage).catch(function (e) {
              if (e) {
                console.log(e.plugin);
                if (e.stack) {
                  console.log(e.stack);
                }
              }
            });
          }
          return p;
        }, Promise.resolve('start'))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
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
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var moduleInnerPath = fPath.replace(modulePath, '');
        var fileName = path.basename(moduleInnerPath);
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var pageIndex = dirnameArr.indexOf('page');
        var pageName = dirnameArr.splice(pageIndex + 1, 1)[0];
        var pageFile = path.join(modulePath, 'page', pageName, pageName + '.html');
        var fileDest = path.join(modulePath, 'dist', '_', 'page', pageName);

        var args = {};
        var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
          src: fPath,
          dest: fileDest
        });
        var p = null;
        if (/\.js/.test(path.extname(fPath))) {
          args = { pageFiles: [pageFile]};
          p = taskList.serve_js($, appConf, moduleConf, args);
        } else {
          args = { pageFiles: [pageFile], cssFile: path.join(fileDest, fileName), fileDest: fileDest };
          p = taskList.serve_css($, appConf, moduleConf, args);
        }

        copyFilePromise(mod, modulePath, conf.appPath)
          .then(p.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, pageName + '.html')]);
          });
      });

      // 监听widget的sass/less/css/js文件的变动
      vfs.watch([
        '*/widget/**/*.?(css|sass|scss|less|js)'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleInnerPath = fPath.replace(modulePath, '');
        var fileName = path.basename(moduleInnerPath);
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var widgetIndex = dirnameArr.indexOf('widget');
        var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
        var currentUrl = maltose.getCurrentUrl();
        var fileDest = path.join(modulePath, 'dist', '_', 'widget', widgetName);
        var mods = [];
        if (moduleFolder !== appConf.common) {
          mods = [moduleFolder];
        } else {
          mods = moduleList;
        }
        var moduleInfoList = mods.map(function (item) {
          var dependency = null;
          var mapJsonPath = path.join(conf.appPath, item, 'dist', 'map.json');
          var staticConfPath = path.join(conf.appPath, item, 'static-conf.js');
          var staticConf = require(staticConfPath);
          var mapJson = null;
          if (Util.existsSync(mapJsonPath)) {
            mapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
            dependency = mapJson.dependency;
          }
          var modPath = path.join(conf.appPath, item);
          return {
            module: item,
            modulePath: modPath,
            moduleConf: require(path.join(modPath, 'module-conf')),
            dependency: dependency,
            staticConf: staticConf
          };
        });
        var copyFilePromise = taskList.copy_file($, appConf, require(path.join(modulePath, 'module-conf')), {
          src: fPath,
          dest: fileDest
        });
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
            var p = null;
            if (/\.js/.test(path.extname(fPath))) {
              args = { pageFiles: pages, cssFile: path.join(fileDest, fileName) };
              p = taskList.serve_js($, appConf, item.moduleConf, args);
            } else {
              args = { pageFiles: pages, cssFile: path.join(fileDest, fileName), fileDest: fileDest };
              p = taskList.serve_css($, appConf, item.moduleConf, args);
            }
            return {
              copyFile: copyFilePromise.bind(null, mod, item.modulePath, conf.appPath),
              serveStatic: p.bind(null, mod, item.modulePath, conf.appPath)
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
            p = curr.copyFile().then(curr.serveStatic).catch(function (e) {
              if (e) {
                console.log(e.plugin);
                if (e.stack) {
                  console.log(e.stack);
                }
              }
            });
          }
          return p;
        }, Promise.resolve('start'))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
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

      // 监听所有图片文件的变动
      vfs.watch([
        '*/page/**/images/**',
        '*/static/**/images/**',
        '*/widget/**/images/**'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var fileTransfer = path.join(modulePath, 'dist', 'output', 'images');
        var fileDest = path.join(conf.appPath, '.temp', appConf.app, moduleFolder, 'images');
        var currentUrl = maltose.getCurrentUrl();
        if (ev.type === 'deleted') {
          var appInnerPath = fPath.replace(conf.appPath, '');
          var appInnerPathArr = appInnerPath.split(path.sep);
          var imagesIndex = appInnerPathArr.indexOf('images');
          var imagesPath = appInnerPathArr.splice(imagesIndex + 1).join(path.sep);
          del.sync(path.join(fileTransfer, imagesPath));
          del.sync(path.join(fileDest, imagesPath));
          maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
        } else {
          var copyTransPromise = taskList.copy_file($, appConf, moduleConf, {
            src: fPath,
            dest: fileTransfer
          });
          var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
            src: fPath,
            dest: fileDest
          });
          copyTransPromise(mod, modulePath, conf.appPath)
            .then(copyFilePromise.bind(null, mod, modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
            });
        }
      });

      // 修改static目录下的sass/less/css/js文件，暂时做重新编译整个模块处理
      vfs.watch([
        '*/static/**/*.?(css|sass|scss|less|js)'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var moduleInnerPath = fPath.replace(modulePath, '');
        var fileName = path.basename(moduleInnerPath);
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var staticIndex = dirnameArr.indexOf('static');
        var staticAfter = dirnameArr.splice(staticIndex + 1).join(path.sep);
        var currentUrl = maltose.getCurrentUrl();
        
        var fileDest = path.join(modulePath, 'dist', '_', 'static', staticAfter);
        var args = {};
        var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
          src: fPath,
          dest: fileDest
        });
        var p = null;
        if (/\.js/.test(path.extname(fPath))) {
          args = { pageFiles: [], cssFile: path.join(fileDest, fileName) };
          p = taskList.serve_js($, appConf, moduleConf, args);
        } else {
          args = {
            pageFiles: [],
            cssFile: path.join(fileDest, fileName),
            fileDest: fileDest,
            needGraphCheck: true
          };
          p = taskList.serve_css($, appConf, moduleConf, args);
        }

        copyFilePromise(mod, modulePath, conf.appPath)
          .then(p.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
          }).catch(function (e) {
            console.log(e);
          });
      });
      
      // 监听*-conf.js的改动，重新编译模块
      vfs.watch([
        '*/*-conf.js'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var currentUrl = maltose.getCurrentUrl();
        buildSingleModuleSimple(app, moduleFolder, conf, args).then(function () {
          maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
        });
      });
    });
  } else if (conf.buildType === BUILD_MODULE) {
    if (!mod) {
      mod = conf.moduleConf.module;
    }
    var buildModuleFunction = isDist ? buildSingleModule : buildSingleModuleSimple;
    return buildModuleFunction(app, mod, conf, args)
      .catch(function (err) {
        console.log(err);
      })
      .then(function () {
        var dependency = null;
        var mapJsonPath = path.join(conf.modulePath, 'dist', 'map.json');
        var mapJson = null;
        var staticConfPath = path.join(conf.modulePath, 'static-conf.js');
        var staticConf = require(staticConfPath);

        if (Util.existsSync(mapJsonPath)) {
          mapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
          dependency = mapJson.dependency;
        }
        var page = args ? args.page : undefined;
        var tempFolder = path.join(conf.appPath, '.temp');
        var serverParam = {
          baseDir: tempFolder,
          shortPath: appConf.app
        };

        if (page) {
          serverParam.baseDir = tempFolder;
          serverParam.touchIndex = conf.moduleConf.module + '/' + page + '.html';
        }
        $.util.log($.util.colors.green('预览' + mod + '模块...'));
        var silence = args.silence ? args.silence : false;
        var maltose = new Maltose({
          port: 35729,
          server: serverParam,
          silence: silence
        });
        maltose.serve();
        // 监听page的html文件变动
        vfs.watch([
          'page/**/*.html'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var args = { pageFiles: [fPath], type: ev.type };
          var servePagePromise = taskList.serve_page($, appConf, conf.moduleConf, args);
          servePagePromise(mod, conf.modulePath, conf.appPath)
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(fPath))]);
            });
        });

        // 监听widget的html文件变动
        vfs.watch([
          'widget/**/*.html'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var dirname = path.dirname(moduleInnerPath);
          var dirnameArr = dirname.split(path.sep);
          var widgetIndex = dirnameArr.indexOf('widget');
          var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
          var pages = [];
          var currentUrl = maltose.getCurrentUrl();
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
          var servePagePromise = taskList.serve_page($, appConf, conf.moduleConf, args);
          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(servePagePromise.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
            });
        });

        // 监听page的sass/less/css/js文件的变动
        vfs.watch([
          'page/**/*.?(css|sass|scss|less|js)'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var fileName = path.basename(moduleInnerPath);
          var dirname = path.dirname(moduleInnerPath);
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
            p = taskList.serve_js($, appConf, conf.moduleConf, args);
          } else {
            args = { pageFiles: [pageFile], cssFile: path.join(fileDest, fileName), fileDest: fileDest };
            p = taskList.serve_css($, appConf, conf.moduleConf, args);
          }

          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(p.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, pageName + '.html')]);
            });
        });

        // 监听widget的sass/less/css/js文件的变动
        vfs.watch([
          'widget/**/*.?(css|sass|scss|less|js)'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var fileName = path.basename(moduleInnerPath);
          var dirname = path.dirname(moduleInnerPath);
          var dirnameArr = dirname.split(path.sep);
          var widgetIndex = dirnameArr.indexOf('widget');
          var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
          var pages = [];
          var currentUrl = maltose.getCurrentUrl();
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
            p = taskList.serve_js($, appConf, conf.moduleConf, args);
          } else {
            args = { pageFiles: pages, cssFile: path.join(fileDest, fileName), fileDest: fileDest };
            p = taskList.serve_css($, appConf, conf.moduleConf, args);
          }

          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(p.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
            });
        });

        // 监听所有图片文件的变动
        vfs.watch([
          'page/**/images/**',
          'static/**/images/**',
          'widget/**/images/**'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var fileDest = path.join(conf.appPath, '.temp', appConf.app, mod, 'images');
          var fileTransfer = path.join(conf.modulePath, 'dist', 'output', 'images');
          var currentUrl = maltose.getCurrentUrl();
          if (ev.type === 'deleted') {
            var moduleInnerPath = fPath.replace(conf.modulePath, '');
            var moduleInnerPathArr = moduleInnerPath.split(path.sep);
            var imagesIndex = moduleInnerPathArr.indexOf('images');
            var imagesPath = moduleInnerPathArr.splice(imagesIndex + 1).join(path.sep);
            del.sync(path.join(fileTransfer, imagesPath));
            del.sync(path.join(fileDest, imagesPath), { force: true });
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
          } else {
            var copyTransPromise = taskList.copy_file($, appConf, conf.moduleConf, {
              src: fPath,
              dest: fileTransfer
            });
            var copyFilePromise = taskList.copy_file($, appConf, conf.moduleConf, {
              src: fPath,
              dest: fileDest
            });
            copyTransPromise(mod, conf.modulePath, conf.appPath)
              .then(copyFilePromise.bind(null, mod, conf.modulePath, conf.appPath))
              .then(function () {
                maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
              });
          }
        });

        // 修改static目录下的sass/less/css/js文件，暂时做重新编译整个模块处理
        vfs.watch([
          'static/**/*.?(css|sass|scss|less|js)'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var fileName = path.basename(moduleInnerPath);
          var dirname = path.dirname(moduleInnerPath);
          var dirnameArr = dirname.split(path.sep);
          var staticIndex = dirnameArr.indexOf('static');
          var staticAfter = dirnameArr.splice(staticIndex + 1).join(path.sep);
          var currentUrl = maltose.getCurrentUrl();
          
          var fileDest = path.join(conf.modulePath, 'dist', '_', 'static', staticAfter);
          var args = {};
          var copyFilePromise = taskList.copy_file($, appConf, conf.moduleConf, {
            src: fPath,
            dest: fileDest
          });
          var p = null;
          if (/\.js/.test(path.extname(fPath))) {
            args = { pageFiles: [], cssFile: path.join(fileDest, fileName) };
            p = taskList.serve_js($, appConf, conf.moduleConf, args);
          } else {
            args = { 
              pageFiles: [], 
              cssFile: path.join(fileDest, fileName), 
              fileDest: fileDest,
              needGraphCheck: true
            };
            p = taskList.serve_css($, appConf, conf.moduleConf, args);
          }

          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(p.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
            }).catch(function (e) {
              console.log(e);
            });
        });
        
        // 监听*-conf.js的改动，重新编译模块
        vfs.watch([
          '*-conf.js'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var currentUrl = maltose.getCurrentUrl();
          buildSingleModuleSimple(app, mod, conf, args).then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
          });
        });
      });
  }
}

/**
 * server模式预览
 */
function serveServer (conf, app, mod, args) {
  var isDist = args.dist ? args.dist : false;
  var appConf = conf.appConf;
  if (conf.buildType === BUILD_APP) {
    return build(app, mod, _.assign({ isSimple: !isDist }, args)).then(function () {
      var page = args ? args.page : undefined;
      var tempFolder = path.join(conf.appPath, '.temp');
      var serverParam = {
        baseDir: tempFolder,
        shortPath: appConf.app
      };
      if (page && mod) {
        if (_.isArray(mod)) {
          if (mod.length > 1) {
            gutil.log(gutil.colors.yellow('输入了多个模块，只取最后一个！'));
          }
          mod = mod[mod.length - 1];
        }
        serverParam.baseDir = tempFolder;
        serverParam.touchIndex = mod + '/' + page + '.html';
      }
      var silence = args.silence ? args.silence : false;
      var maltose = new Maltose({
        port: 35729,
        server: serverParam,
        silence: silence
      });
      maltose.serve();

      var moduleList = mod ? mod : appConf.moduleList;

      // 监听不同类型文件的改变
      // 监听page的html文件变动
      vfs.watch([
        '*/page/**/*.html'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleInnerPath = fPath.replace(modulePath, '');
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var pageIndex = dirnameArr.indexOf('page');
        var pageName = dirnameArr.splice(pageIndex + 1, 1)[0];
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var args = { pageFiles: [fPath], type: ev.type };
        var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
          src: fPath,
          dest: path.join(modulePath, 'dist', '_', 'page', pageName)
        });
        var servePageServerPromise = taskList.serve_page_server($, appConf, moduleConf, args);
        copyFilePromise(mod, modulePath, conf.appPath)
          .then(servePageServerPromise.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(fPath))]);
          });
      });

      // 监听widget的html文件变动
      vfs.watch([
        '*/widget/**/*.html'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleInnerPath = fPath.replace(modulePath, '');
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var widgetIndex = dirnameArr.indexOf('widget');
        var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
        var currentUrl = maltose.getCurrentUrl();
        var mods = [];
        var isGbWidget = false;
        //module 
        if (moduleFolder !== appConf.common) {
          mods = [moduleFolder];
        } else {
          mods = moduleList;
          isGbWidget = true;
        }
        var moduleInfoList = mods.map(function (item) {
          var dependency = null;
          var mapJsonPath = path.join(conf.appPath, item, 'dist', 'map.json');
          var staticConfPath = path.join(conf.appPath, item, 'static-conf.js');
          var staticConf = require(staticConfPath);
          var mapJson = null;
          if (Util.existsSync(mapJsonPath)) {
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
          if (isGbWidget || pages.length > 0) {
            var args = { pageFiles: pages, type: ev.type };
            var copyFilePromise = taskList.copy_file($, appConf, item.moduleConf, {
              src: fPath,
              dest: path.join(item.modulePath, 'dist', '_', 'widget', widgetName)
            });
            var servePageServerPromise = taskList.serve_page_server($, appConf, item.moduleConf, args);
            return {
              copyFile: copyFilePromise.bind(null, mod, item.modulePath, conf.appPath),
              servePage: servePageServerPromise.bind(null, mod, item.modulePath, conf.appPath)
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
            p = curr.copyFile().then(curr.servePage).catch(function (e) {
              if (e) {
                console.log(e.plugin);
                if (e.stack) {
                  console.log(e.stack);
                }
              }
            });
          }
          return p;
        }, Promise.resolve('start'))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
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
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var moduleInnerPath = fPath.replace(modulePath, '');
        var fileName = path.basename(moduleInnerPath);
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var pageIndex = dirnameArr.indexOf('page');
        var pageName = dirnameArr.splice(pageIndex + 1, 1)[0];
        var fileDest = path.join(modulePath, 'dist', '_', 'page', pageName);

        var args = { fPath: fPath, type: ev.type, serveFolder: path.join('page', pageName) };
        var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
          src: fPath,
          dest: fileDest
        });
        var p = null;
        if (Util.regexps.js.test(fPath)) {
          p = taskList.serve_js_server($, appConf, moduleConf, args);
        } else {
          p = taskList.serve_css_server($, appConf, moduleConf, args);
        }
        copyFilePromise(mod, modulePath, conf.appPath)
          .then(p.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, pageName + '.html')]);
          });
      });

      // 监听widget的sass/less/css/js文件的变动
      vfs.watch([
        '*/widget/**/*.?(css|sass|scss|less|js)'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var currentUrl = maltose.getCurrentUrl();
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var moduleInnerPath = fPath.replace(modulePath, '');
        var fileName = path.basename(moduleInnerPath);
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var widgetIndex = dirnameArr.indexOf('widget');
        var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
        var fileDest = path.join(modulePath, 'dist', '_', 'widget', widgetName);

        var args = { fPath: fPath, type: ev.type, serveFolder: path.join('widget', widgetName) };
        var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
          src: fPath,
          dest: fileDest
        });
        var p = null;
        if (Util.regexps.js.test(fPath)) {
          p = taskList.serve_js_server($, appConf, moduleConf, args);
        } else {
          p = taskList.serve_css_server($, appConf, moduleConf, args);
        }
        copyFilePromise(mod, modulePath, conf.appPath)
          .then(p.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
          });
      });

      // 监听所有图片文件的变动
      vfs.watch([
        '*/page/**/images/**',
        '*/static/**/images/**',
        '*/widget/**/images/**'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var fileTransfer = path.join(modulePath, 'dist', 'output', 'images');
        var fileDest = path.join(conf.appPath, '.temp', appConf.app, moduleFolder, 'images');
        var currentUrl = maltose.getCurrentUrl();
        if (ev.type === 'deleted') {
          var appInnerPath = fPath.replace(conf.appPath, '');
          var appInnerPathArr = appInnerPath.split(path.sep);
          var imagesIndex = appInnerPathArr.indexOf('images');
          var imagesPath = appInnerPathArr.splice(imagesIndex + 1).join(path.sep);
          del.sync(path.join(fileTransfer, imagesPath));
          del.sync(path.join(fileDest, imagesPath));
          maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
        } else {
          var copyTransPromise = taskList.copy_file($, appConf, moduleConf, {
            src: fPath,
            dest: fileTransfer
          });
          var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
            src: fPath,
            dest: fileDest
          });
          copyTransPromise(mod, modulePath, conf.appPath)
            .then(copyFilePromise.bind(null, mod, modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
            });
        }
      });

      // 修改static目录下的sass/less/css/js文件
      vfs.watch([
        '*/static/**/*.?(css|sass|scss|less|js)'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var currentUrl = maltose.getCurrentUrl();
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var modulePath = path.join(conf.appPath, moduleFolder);
        var moduleConf = require(path.join(modulePath, 'module-conf'));
        var moduleInnerPath = fPath.replace(modulePath, '');
        var dirname = path.dirname(moduleInnerPath);
        var dirnameArr = dirname.split(path.sep);
        var staticIndex = dirnameArr.indexOf('static');
        var staticAfter = dirnameArr.splice(staticIndex + 1).join(path.sep);
        var fileDest = path.join(modulePath, 'dist', '_', 'static', staticAfter);

        var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
          src: fPath,
          dest: fileDest
        });
        var args = {
          fPath: fPath,
          type: ev.type,
          serveFolder: path.join('static', staticAfter),
          needConcat: true,
          needGraphCheck: true
        };
        var p = null;
        if (Util.regexps.js.test(fPath)) {
          p = taskList.serve_js_server($, appConf, moduleConf, args);
        } else {
          p = taskList.serve_css_server($, appConf, moduleConf, args);
        }
        copyFilePromise(mod, modulePath, conf.appPath)
          .then(p.bind(null, mod, modulePath, conf.appPath))
          .then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
          });
      });
      
      // 监听*-conf.js的改动，重新编译模块
      vfs.watch([
        '*/*-conf.js'
      ], function (ev) {
        maltose.notify('正在编译，请稍等！');
        var fPath = ev.path;
        var moduleFolder = Util.getModuleInfoViaPath(fPath, conf.appPath);
        var currentUrl = maltose.getCurrentUrl();
        buildSingleModuleSimpleServer(app, moduleFolder, conf, args).then(function () {
          maltose.reload([path.join(conf.appPath, '.temp', appConf.app, moduleFolder, path.basename(currentUrl))]);
        });
      });
    });
  } else if (conf.buildType === BUILD_MODULE) {
    if (!mod) {
      mod = conf.moduleConf.module;
    }
    var moduleConf = conf.moduleConf;
    var buildModuleFunction = isDist ? buildSingleModuleServer : buildSingleModuleSimpleServer;
    return buildModuleFunction(app, mod, conf, args)
      .catch(function (err) {
        console.log(err);
      })
      .then(function () {
        var dependency = null;
        var mapJsonPath = path.join(conf.modulePath, 'dist', 'map.json');
        var mapJson = null;
        var staticConfPath = path.join(conf.modulePath, 'static-conf.js');
        var staticConf = require(staticConfPath);

        if (Util.existsSync(mapJsonPath)) {
          mapJson = JSON.parse(fs.readFileSync(mapJsonPath).toString());
          dependency = mapJson.dependency;
        }
        var page = args ? args.page : undefined;
        var tempFolder = path.join(conf.appPath, '.temp');
        var serverParam = {
          baseDir: tempFolder,
          shortPath: appConf.app
        };

        if (page) {
          serverParam.baseDir = tempFolder;
          serverParam.touchIndex = conf.moduleConf.module + '/' + page + '.html';
        }
        $.util.log($.util.colors.green('预览' + mod + '模块...'));
        var silence = args.silence ? args.silence : false;
        var maltose = new Maltose({
          port: 35729,
          server: serverParam,
          silence: silence
        });
        maltose.serve();
        // 监听page的html文件变动
        vfs.watch([
          'page/**/*.html'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var dirname = path.dirname(moduleInnerPath);
          var dirnameArr = dirname.split(path.sep);
          var pageIndex = dirnameArr.indexOf('page');
          var pageName = dirnameArr.splice(pageIndex + 1, 1)[0];
          var args = { pageFiles: [fPath], type: ev.type };
          var copyFilePromise = taskList.copy_file($, appConf, moduleConf, {
            src: fPath,
            dest: path.join(conf.modulePath, 'dist', '_', 'page', pageName)
          });
          var servePageServerPromise = taskList.serve_page_server($, appConf, moduleConf, args);
          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(servePageServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(fPath))]);
            });
        });

        // 监听widget的html文件变动
        vfs.watch([
          'widget/**/*.html'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var dirname = path.dirname(moduleInnerPath);
          var dirnameArr = dirname.split(path.sep);
          var widgetIndex = dirnameArr.indexOf('widget');
          var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
          var pages = [];
          var currentUrl = maltose.getCurrentUrl();
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
          var servePageServerPromise = taskList.serve_page_server($, appConf, conf.moduleConf, args);
          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(servePageServerPromise.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
            });
        });

        // 监听page的sass/less/css/js文件的变动
        vfs.watch([
          'page/**/*.?(css|sass|scss|less|js)'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var fileName = path.basename(moduleInnerPath);
          var dirname = path.dirname(moduleInnerPath);
          var dirnameArr = dirname.split(path.sep);
          var pageIndex = dirnameArr.indexOf('page');
          var pageName = dirnameArr.splice(pageIndex + 1, 1)[0];
          var fileDest = path.join(conf.modulePath, 'dist', '_', 'page', pageName);
          var args = { fPath: fPath, type: ev.type, serveFolder: path.join('page', pageName) };
          var copyFilePromise = taskList.copy_file($, conf.appConf, conf.moduleConf, {
            src: fPath,
            dest: fileDest
          });
          var p = null;
          if (/\.js/.test(path.extname(fPath))) {
            p = taskList.serve_js_server($, appConf, conf.moduleConf, args);
          } else {
            p = taskList.serve_css_server($, appConf, conf.moduleConf, args);
          }

          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(p.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, pageName + '.html')]);
            });
        });

        // 监听widget的sass/less/css/js文件的变动
        vfs.watch([
          'widget/**/*.?(css|sass|scss|less|js)'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var fileName = path.basename(moduleInnerPath);
          var dirname = path.dirname(moduleInnerPath);
          var dirnameArr = dirname.split(path.sep);
          var widgetIndex = dirnameArr.indexOf('widget');
          var widgetName = dirnameArr.splice(widgetIndex + 1, 1)[0];
          var currentUrl = maltose.getCurrentUrl();
          var fileDest = path.join(conf.modulePath, 'dist', '_', 'widget', widgetName);
          var args = { fPath: fPath, type: ev.type, serveFolder: path.join('widget', widgetName) };
          var copyFilePromise = taskList.copy_file($, conf.appConf, conf.moduleConf, {
            src: fPath,
            dest: fileDest
          });
          var p = null;
          if (/\.js/.test(path.extname(fPath))) {
            p = taskList.serve_js_server($, appConf, conf.moduleConf, args);
          } else {
            p = taskList.serve_css_server($, appConf, conf.moduleConf, args);
          }

          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(p.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
            });
        });

        // 监听所有图片文件的变动
        vfs.watch([
          'page/**/images/**',
          'static/**/images/**',
          'widget/**/images/**'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var fileDest = path.join(conf.appPath, '.temp', appConf.app, mod, 'images');
          var fileTransfer = path.join(conf.modulePath, 'dist', 'output', 'images');
          var currentUrl = maltose.getCurrentUrl();
          if (ev.type === 'deleted') {
            var moduleInnerPath = fPath.replace(conf.modulePath, '');
            var moduleInnerPathArr = moduleInnerPath.split(path.sep);
            var imagesIndex = moduleInnerPathArr.indexOf('images');
            var imagesPath = moduleInnerPathArr.splice(imagesIndex + 1).join(path.sep);
            del.sync(path.join(fileTransfer, imagesPath));
            del.sync(path.join(fileDest, imagesPath), { force: true });
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
          } else {
            var copyTransPromise = taskList.copy_file($, appConf, conf.moduleConf, {
              src: fPath,
              dest: fileTransfer
            });
            var copyFilePromise = taskList.copy_file($, appConf, conf.moduleConf, {
              src: fPath,
              dest: fileDest
            });
            copyTransPromise(mod, conf.modulePath, conf.appPath)
              .then(copyFilePromise.bind(null, mod, conf.modulePath, conf.appPath))
              .then(function () {
                maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
              });
          }
        });

        // 修改static目录下的sass/less/css/js文件
        vfs.watch([
          'static/**/*.?(css|sass|scss|less|js)'
        ], function (ev) {
          maltose.notify('正在编译，请稍等！');
          var fPath = ev.path;
          var moduleInnerPath = fPath.replace(conf.modulePath, '');
          var dirname = path.dirname(moduleInnerPath);
          var dirnameArr = dirname.split(path.sep);
          var staticIndex = dirnameArr.indexOf('static');
          var staticAfter = dirnameArr.splice(staticIndex + 1).join(path.sep);
          var currentUrl = maltose.getCurrentUrl();
          var fileDest = path.join(conf.modulePath, 'dist', '_', 'static', staticAfter);
          var args = {
            fPath: fPath,
            type: ev.type,
            serveFolder: path.join('static', staticAfter),
            needConcat: true,
            needGraphCheck: true
          };
          var copyFilePromise = taskList.copy_file($, conf.appConf, conf.moduleConf, {
            src: fPath,
            dest: fileDest
          });
          var p = null;
          if (/\.js/.test(path.extname(fPath))) {
            p = taskList.serve_js_server($, appConf, conf.moduleConf, args);
          } else {
            p = taskList.serve_css_server($, appConf, conf.moduleConf, args);
          }

          copyFilePromise(mod, conf.modulePath, conf.appPath)
            .then(p.bind(null, mod, conf.modulePath, conf.appPath))
            .then(function () {
              maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
            });
        });
        
        // 监听*-conf.js的改动，重新编译模块
        vfs.watch([
          '*-conf.js'
        ], function () {
          maltose.notify('正在编译，请稍等！');
          var currentUrl = maltose.getCurrentUrl();
          buildSingleModuleSimpleServer(app, mod, conf, args).then(function () {
            maltose.reload([path.join(conf.appPath, '.temp', appConf.app, mod, path.basename(currentUrl))]);
          });
        });
      });
  }
}

/**
 * 发布
 */
function publish (app, mod, args) {
  var conf = getConf(app, mod);
  args = args || {};
  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可以发布的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }

  var appConf = conf.appConf;
  var comboConf = typeof appConf.comboConf === 'object' ? appConf.comboConf : {
    mode: 'client'
  };
  var buildModuleFunction = null;
  var publishFunction = null;
  if (comboConf.mode === 'server') {
     buildModuleFunction = buildSingleModuleServer;
     publishFunction = taskList.publish_server;
  } else {
    buildModuleFunction = buildSingleModule;
    publishFunction = taskList.publish;
  }
  args = _.assign(args, {
    isPublish: true,
    comboMode: comboConf.mode
  });
  if (conf.buildType === BUILD_APP) {
    var moduleList = [];
    if (mod) {
      moduleList = mod;
    } else {
      moduleList = appConf.moduleList;
      $.util.log($.util.colors.yellow('Allo Allo! Begin to publish app ' + appConf.app + '!'));
    }
    var commonModule = appConf.common;
    if (moduleList.indexOf(commonModule) >= 0) {
      gutil.log(gutil.colors.red('检测到您正在发布公共模块，请先确认公共模块代码是否最新再继续发布！'));
    }
    var promsies = [];
    var publishFiles = [];
    for (var i = 0; i < moduleList.length; i ++) {
      promsies[i] = i;
    }
    return promsies.reduce(function (prev, curr) {
      return prev.then(function (val) {
        conf = getConf(app, moduleList[curr]);
        var uploadPromise = taskList.upload($, appConf, conf.moduleConf, args);
        var publishPromise = publishFunction($, appConf, conf.moduleConf, args);
        var modulePath = path.join(conf.appPath, moduleList[curr]);
        return buildModuleFunction(app, moduleList[curr], conf, args)
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
          appConf: appConf,
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
    if (mod === appConf.common) {
      gutil.log(gutil.colors.red('检测到您正在发布公共模块，请先确认公共模块代码是否最新再继续发布！'));
    }
    var uploadPromise = taskList.upload($, appConf, conf.moduleConf, args);
    var publishPromise = publishFunction($, appConf, conf.moduleConf, args);
    return buildModuleFunction(app, mod, conf, args)
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

/**
 * 拷贝
 */
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
  build: build, // ath build
  serve: serve,  // ath serve
  publish: publish,  // ath publish
  clone: clone  // ath clone
};
