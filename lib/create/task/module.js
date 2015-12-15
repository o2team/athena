'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var inquirer = require('inquirer');
var uuid = require('uuid');

var Base = require('../base');
var Util = require('../../util');

var MModule = Base.extend({
  construct: function (options) {
    this.conf = _.assign({
      appName: null,
      moduleName: null,
      author: null,
      moduleDescription: null,
      date: null
    }, options);
    this.resolved = __dirname;
    this.super.apply(this, arguments);
    this.init();
  },

  init: function () {
    this.gConfig = Util.getConfig();
    var userHome = Util.homedir();
    if (this.gConfig.user_name) {
      this.userName = this.gConfig.user_name;
    } else {
      this.needSetUsername = true;
      this.userName = process.env.USER || path.basename(userHome);
    }
    this.appConfPath = this.destinationPath('app-conf.js');
    console.log(chalk.magenta('  Allo ' + this.userName + '! 我要开始创建模块了哟~'));
    console.log('  need help? go and open issue: https://github.com/o2team/athena-html/issues/new');
  },

  talk: function (cb) {
    var prompts = [];
    if (typeof this.conf.moduleName !== 'string') {
      prompts.push({
        type: 'input',
        name: 'moduleName',
        message: '告诉我模块名称吧~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(this.destinationPath(input))) {
            return '模块已经存在哦，如果你只想增加页面，请使用 athena -p 页面名~';
          }
          return true;
        }.bind(this)
      });
    } else if (fs.existsSync(this.destinationPath(this.conf.moduleName))) {
      prompts.push({
        type: 'input',
        name: 'moduleName',
        message: '模块已经存在哦，换个名字吧~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(this.destinationPath(input))) {
            return '模块已经存在哦，换个名字吧~';
          }
          return true;
        }.bind(this)
      });
    }
    if (!this.userName) {
      prompts.push({
        type: 'input',
        name: 'author',
        message: '雁过留声，人过留名~~'
      });
    }
    prompts.push({
      type: 'input',
      name: 'moduleDescription',
      message: '这个模块是干什么的呢？',
    });

    prompts.push({
      type: 'list',
      name: 'cssPretreatment',
      message: '想使用什么css预处理器呢？',
      choices: [{
        name: 'Sass/Compass',
        value: 'sass'
      }, {
        name: 'Less',
        value: 'less'
      }, {
        name: '不需要',
        value: 'none'
      }]
    });

    inquirer.prompt(prompts, function(answers) {
      var appConf = require(this.appConfPath);
      if (!answers.author) {
        answers.author = this.userName;
      }
      this.gConfig.user_name = answers.author;
      if (this.needSetUsername) {
        Util.setConfig(this.gConfig);
      }
      _.assign(this.conf, answers);
      this.conf.appName = appConf.app;
      this.conf.moduleDescription = this.conf.moduleDescription || '';
      this.write(cb);
    }.bind(this));
  },

  write: function (cb) {
    // 创建目录
    var conf = this.conf;
    conf.moduleId = uuid.v1();
    this.mkdir(conf.moduleName);
    this.mkdir(conf.moduleName + '/page');
    this.mkdir(conf.moduleName + '/static');
    this.mkdir(conf.moduleName + '/static/css');
    this.mkdir(conf.moduleName + '/static/images');
    this.mkdir(conf.moduleName + '/static/js');
    if (conf.cssPretreatment === 'sass') {
      this.mkdir(conf.moduleName + '/static/sass');
    } else if (conf.cssPretreatment === 'less') {
      this.mkdir(conf.moduleName + '/static/less');
    }
    this.mkdir(conf.moduleName + '/widget');

    this.copy('module' ,'_module-conf.js', conf.moduleName + '/module-conf.js');
    this.copy('module' ,'_static-conf.js', conf.moduleName + '/static-conf.js');

    this.fs.commit(function () {
      var appConf = require(this.appConfPath);
      var appConfFile = fs.readFileSync(this.appConfPath);
      var appConfStr = String(appConfFile);
      var appConfStrLines = appConfStr.split('\n');

      if (appConf.moduleList.indexOf(conf.moduleName) < 0) {
        for (var i = 0; i < appConfStrLines.length; i++) {
          var line = appConfStrLines[i];
          if (line.indexOf('moduleList') >= 0) {
            appConfStrLines[i] = line.split(']')[0];
            appConfStrLines[i] += ', \'' + conf.moduleName + '\'],';
          }
        }
        fs.writeFileSync(this.appConfPath, appConfStrLines.join('\n'));
      }
      if (typeof cb === 'function') {
        cb(conf.moduleName);
      }
      console.log(chalk.green('    创建文件:' + conf.moduleName + '/module-conf.js'));
      console.log(chalk.green('    创建文件:' + conf.moduleName + '/static-conf.js'));
      console.log();
      console.log('    ' + chalk.bgGreen('模块' + conf.moduleName + '创建成功！'));
      console.log();
      console.log(chalk.yellow('    请执行 cd ' + conf.moduleName + ' 进入到模块下开始工作吧！'));
      console.log();
    }.bind(this));
  },

  create: function (cb) {
    this.talk(cb);
  }
});

module.exports = MModule;
