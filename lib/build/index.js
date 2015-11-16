'use strict'

var fs = require('fs');
var path = require('path');
var $ = require('gulp-load-plugins')({lazy: true});
var requireDir = require('require-dir');
var vfs = require('vinyl-fs');
var browserSync = require('browser-sync');
var del = require('del');

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
  mod = mod ? mod : '';

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

// 任务列表
var taskList = requireDir('./tasks');

// 编译单个模块
function buildSingleModule (app, mod, conf) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(app, mod);
  del.sync(conf.modulePath + '/dist');
  var allPromise = taskList.all($, conf.appConf, conf.moduleConf);
  var athenaMatePromise = taskList.athena_mate($, conf.appConf, conf.moduleConf);
  var stylesPromise = taskList.styles($, conf.appConf, conf.moduleConf);
  var scriptsPromise = taskList.scripts($, conf.appConf, conf.moduleConf);
  var fontsPromise = taskList.fonts($, conf.appConf, conf.moduleConf);
  var imagesPromise = taskList.images($, conf.appConf, conf.moduleConf);
  var revPromise = taskList.rev($, conf.appConf, conf.moduleConf);
  var injectPromise = taskList.inject($, conf.appConf, conf.moduleConf);
  var tempPromise = taskList.temp($, conf.appConf, conf.moduleConf);
  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(athenaMatePromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(scriptsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(imagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(fontsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(revPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(injectPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tempPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function () {
      $.util.log($.util.colors.green('结束编译模块' + mod + '！'));
      return Promise.resolve(mod);
    }).catch(function (e) {
      console.log(e && e.stack);
    });
}

function buildSingleModuleSimple (app, mod, conf) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(app, mod);
  del.sync(conf.modulePath + '/dist');
  var allPromise = taskList.all($, conf.appConf, conf.moduleConf);
  var athenaMatePromise = taskList.athena_mate($, conf.appConf, conf.moduleConf);
  var stylesPromise = taskList.styles($, conf.appConf, conf.moduleConf);
  var scriptsPromise = taskList.scripts($, conf.appConf, conf.moduleConf);
  // var revPromise = taskList.rev($, conf.appConf, conf.moduleConf);
  var injectPromise = taskList.inject($, conf.appConf, conf.moduleConf);
  var tempPromise = taskList.temp($, conf.appConf, conf.moduleConf);

  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(athenaMatePromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(scriptsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    // .then(revPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(injectPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tempPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function () {
      $.util.log($.util.colors.green('结束编译模块' + mod + '！'));
      return Promise.resolve(mod);
    }).catch(function (e) {
      console.log(e && e.stack);
    });
}

// 编译
function build (app, mod, isSimple) {
  var conf = getConf(app, mod);
  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可编译的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }
  // 如果编译项目没有指定模块，则顺序编译项目中每一个模块
  if (conf.buildType === BUILD_APP) {
    del.sync(conf.appPath + '/.temp');
    var moduleList = [];
    if (mod) {
      moduleList = [mod];
    } else {
      moduleList = conf.appConf.moduleList;
      $.util.log($.util.colors.yellow('Allo Allo! Begin to build app ' + conf.appConf.app + '!'));
    }

    var promsies = [];
    for (var i = 0; i < moduleList.length; i ++) {
      promsies[i] = i;
    }

    return promsies.reduce(function (prev, curr) {
      return prev.then(function (val) {
        if (isSimple) {
          return buildSingleModuleSimple(app, moduleList[curr], conf);
        }
        return buildSingleModule(app, moduleList[curr], conf);
      });
    }, Promise.resolve('start')).catch(function (e) {
      console.log(e.stack);
    });
  } else if (conf.buildType === BUILD_MODULE) {
    if (isSimple) {
      return buildSingleModuleSimple(app, mod, conf);
    }
    return buildSingleModule(app, mod, conf);
  }
}

// 预览
function serve(app, mod, args) {
  var conf = getConf(app, mod);

  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可供预览的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }

  if (conf.buildType === BUILD_APP) {
    del.sync(conf.appPath + '/.temp');
    build(app, mod, true).then(function () {
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
    });
    // watch for changes
    vfs.watch([
      conf.appPath + '/*/page/**/*.*',
      conf.appPath + '/*/widget/**/*.*',
      conf.appPath + '/*/static/**/*.*'
    ], function (ev) {
      var p = ev.path;
      var folderNames = path.dirname(p).split(path.sep);
      var appIndex = folderNames.indexOf(conf.appConf.app);
      if (!appIndex) {
        return;
      }
      var moduleFolder = folderNames[appIndex + 1];
      if (moduleFolder === conf.appConf.common) {
        build(app, null).then(function () {
          browserSync.reload();
        });
      } else {
        buildSingleModuleSimple(app, moduleFolder, conf).then(function () {
          browserSync.reload();
        });
      }
    });
  } else if (conf.buildType === BUILD_MODULE) {
    if (!mod) {
      mod = conf.moduleConf.module;
    }
    var servePromise = taskList.serve($, conf.appConf, conf.moduleConf, args);
    buildSingleModuleSimple(app, mod, conf).then(servePromise.bind(null, mod, conf.modulePath, conf.appPath));
    vfs.watch([
      'page/**/*.*',
      'widget/**/*.*',
      'static/**/*.*'
    ], function () {
      buildSingleModuleSimple(app, mod, conf).then(function () {
        browserSync.reload();
      });
    });
  }
}

// 部署
function deploy (app, mod) {
  var conf = getConf(app, mod);
  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可以部署的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }

  if (conf.buildType === BUILD_APP) {
    var moduleList = [];
    if (mod) {
      moduleList = [mod];
    } else {
      moduleList = conf.appConf.moduleList;
      $.util.log($.util.colors.yellow('Allo Allo! Begin to deploy app ' + conf.appConf.app + '!'));
    }
    var promsies = [];
    for (var i = 0; i < moduleList.length; i ++) {
      promsies[i] = i;
    }
    return promsies.reduce(function (prev, curr) {
      return prev.then(function (val) {
        conf = getConf(app, moduleList[curr]);
        var deployPromise = taskList.deploy($, conf.appConf, conf.moduleConf);
        var modulePath = path.join(conf.appPath, moduleList[curr]);
        return buildSingleModule(app, moduleList[curr], conf).then(deployPromise.bind(null, moduleList[curr], modulePath, conf.appPath));
      });
    }, Promise.resolve('start')).then(function () {
      return Promise.resolve({
        appConf: conf.appConf,
        mods: moduleList
      });
    }).catch(function (e) {
      console.log(e.stack);
    });
  } else if (conf.buildType === BUILD_MODULE) {
    if (!mod) {
      mod = conf.moduleConf.module;
    }
    var deployPromise = taskList.deploy($, conf.appConf, conf.moduleConf);
    return buildSingleModule(app, mod, conf).then(deployPromise.bind(null, mod, conf.modulePath, conf.appPath))
      then(function () {
        return Promise.resolve({
          appConf: conf.appConf,
          mods: [mod]
        });
      }).catch(function (e) {
      console.log(e.stack);
    });
  }
}

// 发布
function publish (app, mod, args) {
  var conf = getConf(app, mod);

  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可以发布的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }

  if (conf.buildType === BUILD_APP) {
    var moduleList = [];
    if (mod) {
      moduleList = [mod];
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
        return buildSingleModule(app, moduleList[curr], conf)
          .then(uploadPromise.bind(null, moduleList[curr], modulePath, conf.appPath))
          .then(publishPromise.bind(null, moduleList[curr], modulePath, conf.appPath))
          .then(function (files) {
            publishFiles = publishFiles.concat(files);
          });
      });
    }, Promise.resolve('start'))
      .then(function () {
        return Promise.resolve({
          appConf: conf.appConf,
          files: publishFiles
        });
      }).catch(function (e) {
        console.log(e.stack);
      });
  } else if (conf.buildType === BUILD_MODULE) {
    if (!mod) {
      mod = conf.moduleConf.module;
    }
    var uploadPromise = taskList.upload($, conf.appConf, conf.moduleConf, args);
    var publishPromise = taskList.publish($, conf.appConf, conf.moduleConf, args);
    return buildSingleModule(app, mod, conf)
      .then(uploadPromise.bind(null, mod, conf.modulePath, conf.appPath))
      .then(publishPromise.bind(null, mod, conf.modulePath, conf.appPath))
      .then(function (files) {
        return Promise.resolve({
          appConf: conf.appConf,
          files: files
        });
      }).catch(function (e) {
        console.log(e.stack);
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
      console.log(e.stack);
    });
}

module.exports = {
  build: build,
  serve: serve,
  deploy: deploy,
  publish: publish,
  clone: clone
};
