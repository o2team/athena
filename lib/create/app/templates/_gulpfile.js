'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var minimist = require('minimist');
var path = require('path');
var appConf = require('./app-conf');
var spawn = require('child_process').spawn;
var inquirer = require('inquirer');

// 引入各个项目的gulpfile
var argv = minimist(process.argv.slice(2));
if (typeof argv.module === 'string') {
  var moduleList = argv.module.split(',');
  var hubs = [];
  moduleList.forEach(function (item) {
    hubs.push(item + '/gulpfile.js');
  });
  console.log(hubs);
  $.hub(hubs);
} else {
  $.hub('*/gulpfile.js');
}

gulp.task('deploy', ['temp'], function () {
  var deploy = appConf.deploy;
  var deployOptions = deploy['qiang'];
  var deployParams = {
    host: deployOptions.host,
    user: deployOptions.user,
    pass: deployOptions.pass,
    port: deployOptions.port,
    remotePath: deployOptions.remotePath
  };
  gulp.src('.temp/**')
    .pipe($.ftp(deployParams))
    .pipe($.util.noop());
});

gulp.task('serve', ['temp'], function () {
  var argv = minimist(process.argv.slice(2));
  var tempFolder = '.temp';
  var serverParam = {
    baseDir: tempFolder
  };

  if (argv.page && argv.module) {
    serverParam.baseDir = [tempFolder, tempFolder + '/' + argv.module];
    serverParam.index = argv.module + '/' + argv.page + '.html'
  }
  browserSync({
    notify: false,
    port: 3001,
    server: serverParam
  });

  // watch for changes
  gulp.watch([
    '*/page/**/*.*',
    '*/widget/**/*.*',
  ], function (ev) {
    var p = ev.path;
    var folderNames = path.dirname(p).split(path.sep);
    var appIndex = folderNames.indexOf(appConf.app);
    if (!appIndex) {
      return;
    }
    var moduleFolder = folderNames[appIndex + 1];
    process.chdir(moduleFolder);
    var child = spawn('gulp', ['temp']);
    child.stdout.on('end', function() {
      process.chdir('..');
      reload();
    });
  });
});

gulp.task('clone', function (cb) {
  $.util.log($.util.colors.red('请进入到模块中执行gulp clone 来拷贝widget！'));
  cb();
});
