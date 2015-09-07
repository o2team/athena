#! /usr/bin/env node --harmony

'use strict';

var fs = require('fs');
var path = require('path');
var inquirer = require('inquirer');
var program = require('commander');
var chalk = require('chalk');
var gutil = require('gulp-util');

var Util = require('./lib/util');
var App = require('./lib/create/app');
var MModule = require('./lib/create/module');
var Page = require('./lib/create/page');
var Widget = require('./lib/create/widget');
var builder = require('./lib/build');

var rootPath = __dirname;

program
  .version('0.0.1');

program
  .command('init [url]')
  .description('初始化一个工作目录')
  .action(function (url) {
    var userHome = Util.homedir();
    var userName = path.basename(userHome);
    console.log(chalk.magenta('  Allo ' + userName + '! 开始愉快工作吧~'));
    if (!url) {
      url = process.cwd();
      console.log('  即将设置工作目录为当前目录！');
    } else {
      console.log('  即将设置工作目录为：', url);
    }
    var config = fs.readFileSync(path.join(rootPath, '.config.json'));
    config = JSON.parse(String(config));
    console.log();
    if (!config.work_space) {
      config.work_space = url;
      fs.writeFileSync(path.join(rootPath, '.config.json'), JSON.stringify(config, null, 2));
    } else {
      if (config.work_space !== url) {
        var prompt = [];
        prompt.push({
          type: 'confirm',
          name: 'needNewWorkSpace',
          message: '已经设置过工作目录' + config.work_space + '，是否要以新目录为工作目录？',
          default: false
        });
        inquirer.prompt(prompt, function (answers) {
          if (answers.needNewWorkSpace) {
            config.work_space = url;
            fs.writeFileSync(path.join(rootPath, '.config.json'), JSON.stringify(config, null, 2));
          }
        });
      }
    }
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena init');
    console.log();
  });

program
  .command('app [appName]')
  .alias('a')
  .description('创建一个新的项目')
  .action(function(appName) {
    var app = new App({
      appName: appName
    });
    app.create();
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena app cx');
    console.log('    $ athena a cx');
    console.log();
  });

program
  .command('module [moduleName]')
  .alias('m')
  .description('创建一个新的模块')
  .action(function(moduleName) {
    var mmodule = new MModule({
      moduleName: moduleName
    });
    var appConfPath = mmodule.destinationPath('app-conf.js');
    if (!fs.existsSync(appConfPath)) {
      console.log(chalk.red('  出错了，当前目录没有app-conf.js，请检查当前目录是否是一个项目目录！'));
      return;
    }
    mmodule.create();
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena module my');
    console.log('    $ athena m my');
    console.log();
  });

program
  .command('page [pageName]')
  .alias('pa')
  .description('创建一个新的页面')
  .action(function(pageName) {
    var page = new Page({
      pageName: pageName
    });
    var moduleConfPath = page.destinationPath('module-conf.js');
    if (!fs.existsSync(moduleConfPath)) {
      console.log(chalk.red('  出错了，当前目录没有module-conf.js，请检查当前目录是否是一个模块目录！'));
      return;
    }
    page.create();
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena page shop');
    console.log('    $ athena p shop');
    console.log();
  });

program
  .command('widget [widgetName]')
  .alias('w')
  .description('创建一个新的组件')
  .action(function(widgetName) {
    var widget = new Widget({
      widgetName: widgetName
    });
    var moduleConfPath = widget.destinationPath('module-conf.js');
    if (!fs.existsSync(moduleConfPath)) {
      console.log(chalk.red('  出错了，当前目录没有module-conf.js，请检查当前目录是否是一个模块目录！'));
      return;
    }
    widget.create();
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena widget topbar');
    console.log('    $ athena w topbar');
    console.log();
  });

program
  .command('build')
  .alias('b')
  .description('编译项目or模块')
  .option('-a, --app [appName]', '编译项目')
  .option('-m, --module [moduleName]', '编译模块')
  .action(function (option) {
    var app = null;
    var mod = null;
    // 带参数
    if (option) {
      if (typeof option.app === 'string') {
        app = option.app;
      }
      if (typeof option.module === 'string') {
        mod = option.module;
      }
    }
    builder.build(app, mod);
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena build');
    console.log('    $ athena build -a cx');
    console.log('    $ athena build -m tz');
    console.log();
  });

program
  .command('serve')
  .alias('s')
  .description('预览项目or模块')
  .option('-a, --app [appName]', '预览项目')
  .option('-m, --module [moduleName]', '预览模块')
  .option('--page')
  .action(function (option) {
    var app = null;
    var mod = null;
    // 带参数
    if (option) {
      if (typeof option.app === 'string') {
        app = option.app;
      }
      if (typeof option.module === 'string') {
        mod = option.module;
      }
    }
    builder.serve(app, mod);
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena serve');
    console.log('    $ athena serve -a cx');
    console.log('    $ athena serve -m tz');
    console.log();
  });

program
  .command('deploy')
  .alias('d')
  .description('部署项目or模块，部署到qiang.it机器上')
  .option('-a, --app [appName]', '部署项目')
  .option('-m, --module [moduleName]', '部署模块')
  .option('--verbose')
  .action(function (option) {
    var app = null;
    var mod = null;
    // 带参数
    if (option) {
      if (typeof option.app === 'string') {
        app = option.app;
      }
      if (typeof option.module === 'string') {
        mod = option.module;
      }
    }
    builder.deploy(app, mod);
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena deploy');
    console.log('    $ athena deploy -a cx');
    console.log('    $ athena deploy -m tz');
    console.log();
  });

program
  .command('publish')
  .alias('pu')
  .description('发布项目or模块，发布到tencent/jd开发机')
  .option('-a, --app [appName]', '发布项目')
  .option('-m, --module [moduleName]', '发布模块')
  .action(function (option) {
    var app = null;
    var mod = null;
    // 带参数
    if (option) {
      if (typeof option.app === 'string') {
        app = option.app;
      }
      if (typeof option.module === 'string') {
        mod = option.module;
      }
    }
    builder.publish(app, mod);
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena publish');
    console.log('    $ athena publish -a cx');
    console.log('    $ athena publish -m tz');
    console.log();
  });

program
  .command('clone [widget]')
  .description('复制一个widget')
  .option('-f, --from [source]', '来源模块')
  .option('-t, --to [dest]', '目标模块，不写则当前目录')
  .action(function (widget, option) {
    if (widget === undefined) {
      gutil.log(gutil.colors.red('请输入widgetName'));
      return;
    }
    var source = null;
    var dest = null;
    // 带参数
    if (option) {
      if (typeof option.from === 'string') {
        source = option.from;
      }
      if (typeof option.to === 'string') {
        dest = option.to;
      }
    }
    builder.clone(widget, source, dest);
  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena clone widgetName');
    console.log('    $ athena clone widgetName --from moduleName');
    console.log('    $ athena clone widgetName --from moduleName --to moduleName');
    console.log();
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
