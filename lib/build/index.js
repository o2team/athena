'use strict'

var fs = require('fs');
var path = require('path');
var $ = require('gulp-load-plugins')({lazy: true});
var requireDir = require('require-dir');
var vfs = require('vinyl-fs');
var browserSync = require('browser-sync');
var minimist = require('minimist');

const BUILD_MODULE = 'module';
const BUILD_APP = 'app';
const BUILD_NONE = 'none';

var rootPath = process.cwd();

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

var taskList = requireDir('./tasks');

function buildSingleModule (mod, conf) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(null, mod);

  var athenaMatePromise = taskList.athena_mate($, conf.appConf, conf.moduleConf);
  var stylesPromise = taskList.styles($, conf.appConf, conf.moduleConf);
  var imagesPromise = taskList.images($, conf.appConf, conf.moduleConf);
  var tempPromise = taskList.temp($, conf.appConf, conf.moduleConf);
  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return athenaMatePromise(mod, conf.modulePath, conf.appPath)
    .then(stylesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(imagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tempPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function () {
      $.util.log($.util.colors.green('结束编译模块' + mod + '！'));
      return Promise.resolve(mod);
    });
}

function build (app, mod) {
  var conf = getConf(app, mod);

  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可编译的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }
  // 如果编译项目，则顺序编译项目中每一个模块
  if (conf.buildType === BUILD_APP) {
    $.util.log($.util.colors.yellow('Allo Allo! Begin to build app ' + conf.appConf.app + '!'));
    var moduleList = conf.appConf.moduleList;
    var promsies = [];
    for (var i = 0; i < moduleList.length; i ++) {
      promsies[i] = i;
    }
    return promsies.reduce(function (prev, curr) {
      return prev.then(function (val) {
        return buildSingleModule(moduleList[curr], conf);
      });
    }, Promise.resolve('start')).catch(function (e) {
      console.log(e.stack);
    });
  } else if (conf.buildType === BUILD_MODULE) {
    return buildSingleModule(mod, conf);
  }
}

function serve(app, mod) {
  var conf = getConf(app, mod);

  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可供预览的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }

  if (conf.buildType === BUILD_APP) {
    build(app, mod).then(function () {
      var argv = minimist(process.argv.slice(2));
      var tempFolder = path.join(conf.appPath, '.temp');
      var serverParam = {
        baseDir: tempFolder
      };

      if (argv.page && mod) {
        serverParam.baseDir = [tempFolder, path.join(tempFolder, mod)];
        serverParam.index = path.join(tempFolder, mod, argv.page + '.html');
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
    ], function (ev) {
      var p = ev.path;
      var folderNames = path.dirname(p).split(path.sep);
      var appIndex = folderNames.indexOf(conf.appConf.app);
      if (!appIndex) {
        return;
      }
      var moduleFolder = folderNames[appIndex + 1];
      buildSingleModule(moduleFolder, conf).then(function () {
        browserSync.reload();
      });
    });
  } else if (conf.buildType === BUILD_MODULE) {
    var servePromise = taskList.serve($, conf.appConf, conf.moduleConf);
    buildSingleModule(mod, conf).then(servePromise.bind(null, mod, conf.modulePath, conf.appPath));
    vfs.watch([
      'page/**/*.*',
      'widget/**/*.*',
    ], function () {
      build(app, mod).then(function () {
        new Promise(function () {
          browserSync.reload();
        });
      });
    });
  }
}

function deploy (app, mod) {
  var conf = getConf(app, mod);
  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可以部署的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }
  var deployPromise = taskList.deploy($, conf.appConf, conf.moduleConf);
  if (conf.buildType === BUILD_APP) {
    return build(app, mod).then(function () {
      var deploy = conf.appConf.deploy;
      var deployOptions = deploy['qiang'];
      var deployParams = {
        host: deployOptions.host,
        user: deployOptions.user,
        pass: deployOptions.pass,
        port: deployOptions.port,
        remotePath: deployOptions.remotePath
      };
      vfs.src(conf.appPath + '/.temp/**')
        .pipe($.ftp(deployParams))
        .pipe($.util.noop());
    });
  } else if (conf.buildType === BUILD_MODULE) {
    return buildSingleModule(mod, conf).then(deployPromise.bind(null, mod, conf.modulePath, conf.appPath));
  }
}

function publish (app, mod) {
  var conf = getConf(app, mod);

  if (conf.buildType === BUILD_NONE) {
    $.util.log($.util.colors.red('没要找到可以发布的项目或模块，请找到正确目录重新尝试！'));
    return false;
  }
  var publishPromise = taskList.publish($, conf.appConf, conf.moduleConf);
  if (conf.buildType === BUILD_APP) {
    $.util.log($.util.colors.red('只能发布模块哦~'));
    return false;
  } else if (conf.buildType === BUILD_MODULE) {
    return buildSingleModule(mod, conf).then(publishPromise.bind(null, mod, conf.modulePath, conf.appPath));
  }
}

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
