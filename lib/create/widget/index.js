'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var inquirer = require('inquirer');
var Base = require('../base');
var Util = require('../../util');

var Widget = Base.extend({
  construct: function (options) {
    this.conf = _.assign({
      widgetName: null
    }, options);
    this.resolved = __dirname;
    this.super.apply(this, arguments);
    this.init();
  },

  init: function () {
    var userHome = Util.homedir();
    this.userName = process.env.USER || path.basename(userHome);
    console.log(chalk.magenta('  Allo ' + this.userName + '! 我要开始创建组件了哟~'));
    console.log('need help? go and open issue: https://github.com/JDC-FD/athena-html/issues/new');
  },

  talk: function () {
    var prompts = [];
    var userHome = Util.homedir();
    var userName = path.basename(userHome);
    this.moduleConf = require(this.destinationPath('module-conf'));
    
    if (typeof this.conf.widgetName !== 'string') {
      prompts.push({
        type: 'input',
        name: 'widgetName',
        message: '请告诉我widget名字吧~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(this.destinationPath('widget', input))) {
            return '页面已经存在当前目录中了，换个名字吧~';
          }
          return true;
        }.bind(this)
      });
    } else if (fs.existsSync(this.destinationPath('widget', this.conf.widgetName))) {
      prompts.push({
        type: 'input',
        name: 'widgetName',
        message: '页面已经存在当前目录中了，换个名字吧~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(this.destinationPath('widget', input))) {
            return '页面已经存在当前目录中了，换个名字吧~';
          }
          return true;
        }.bind(this)
      });
    }
    prompts.push({
      type: 'input',
      name: 'description',
      message: '这个widget是用来干嘛的呢~~',
    });
    prompts.push({
      type: 'input',
      name: 'author',
      message: '雁过留声，人过留名~~',
      default: process.env.USER || this.userName,
    });

    inquirer.prompt(prompts, function(anwsers) {
      _.assign(this.conf, anwsers);
      this.conf.date = ((new Date()).getFullYear()) + '-' + ((new Date()).getMonth() + 1) + '-' + ((new Date()).getDate());
      this.conf.modName = this.moduleConf.module;
      this.conf.modClassName = Util.classify(this.conf.modName);
      this.conf.modName = Util.decapitalize(this.conf.modClassName);
      this.conf.appName = this.moduleConf.app;
      this.write();
    }.bind(this));
  },

  write: function () {
    // 创建目录
    var conf = this.conf;
    var widgetName = conf.widgetName;
    this.mkdir('widget/' + widgetName);
    this.mkdir('widget/' + widgetName + '/images');

    this.copy('widget.html', 'widget/' + widgetName + '/' + widgetName + '.html');
    this.copy('widget.css', 'widget/' + widgetName + '/' + widgetName + '.css');
    this.copy('widget.js', 'widget/' + widgetName + '/' + widgetName + '.js');
    this.copy('widget.json', 'widget/' + widgetName + '/' + widgetName + '.json');

    this.fs.commit(function () {
      console.log(chalk.green('    创建文件:' + 'widget/' + widgetName + '/' + widgetName + '.html'));
      console.log(chalk.green('    创建文件:' + 'widget/' + widgetName + '/' + widgetName + '.css'));
      console.log(chalk.green('    创建文件:' + 'widget/' + widgetName + '/' + widgetName + '.js'));
      console.log(chalk.green('    创建文件:' + 'widget/' + widgetName + '/' + widgetName + '.json'));
      console.log();
      console.log('    ' + chalk.bgGreen('组件' + widgetName + '创建成功！'));
      console.log();
    }.bind(this));
  },

  create: function () {
    this.talk();
  }
});

module.exports = Widget;
