'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var inquirer = require('inquirer');
var Base = require('../base');
var Util = require('../../util');

var Page = Base.extend({
  construct: function (options) {
    this.conf = _.assign({
      pageName: null,
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
    console.log(chalk.magenta('  Allo ' + this.userName + '! 我要开始创建页面了哦~'));
    console.log('  need help? go and open issue: https://github.com/o2team/athena-html/issues/new');
  },

  talk: function (cb) {
    var prompts = [];
    var userHome = Util.homedir();
    var userName = path.basename(userHome);
    this.moduleConf = require(this.destinationPath('module-conf'));
    if (typeof this.conf.pageName !== 'string') {
      prompts.push({
        type: 'input',
        name: 'pageName',
        message: '请告诉我页面名字吧~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(this.destinationPath('page', input))) {
            return '页面已经存在当前目录中了，换个名字吧~';
          }
          return true;
        }.bind(this)
      });
    } else if (fs.existsSync(this.destinationPath('page', this.conf.pageName))) {
      prompts.push({
        type: 'input',
        name: 'pageName',
        message: '页面已经存在当前目录中了，换个名字吧~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(this.destinationPath('page', input))) {
            return '页面已经存在当前目录中了，换个名字吧~';
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
      name: 'description',
      message: '这个页面是用来干嘛的呢？'
    });

    prompts.push({
      type: 'confirm',
      name: 'isTencent',
      message: '是否腾讯域下',
      default: true
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
      if (!answers.author) {
        answers.author = this.userName;
      }
      this.gConfig.user_name = answers.author;
      if (this.needSetUsername) {
        Util.setConfig(this.gConfig);
      }
      _.assign(this.conf, answers);
      this.conf.date = ((new Date()).getFullYear()) + '-' + ((new Date()).getMonth() + 1) + '-' + ((new Date()).getDate());
      this.conf.modName = this.moduleConf.module;
      this.conf.modClassName = Util.classify(this.conf.modName);
      this.conf.appName = this.moduleConf.app;
      this.conf.commonModule = this.moduleConf.common;
      if (this.conf.isTencent) {
        this.conf.secondaryDomain = 'static';
      } else {
        this.conf.secondaryDomain = 's';
      }
      this.write(cb);
    }.bind(this));
  },

  write: function (cb) {
    // 创建目录
    var conf = this.conf;

    var pageName = conf.pageName;
    var cssFileName = '';
    this.mkdir('page/' + pageName);
    this.mkdir('page/' + pageName + '/images');
    this.template(this.moduleConf.tmpName , 'page' , 'page.html', 'page/' + pageName + '/' + pageName + '.html', this, {
      delimiter: '$'
    });
    if (conf.cssPretreatment === 'sass') {
      cssFileName = 'page/' + pageName + '/' + pageName + '.scss';
    } else if (conf.cssPretreatment === 'less') {
      cssFileName = 'page/' + pageName + '/' + pageName + '.less';
    } else {
      cssFileName = 'page/' + pageName + '/' + pageName + '.css';
    }
    this.copy(this.moduleConf.tmpName , 'page' , 'page.css', cssFileName);
    this.copy(this.moduleConf.tmpName , 'page' , 'page.js', 'page/' + pageName + '/' + pageName + '.js');
    this.copy(this.moduleConf.tmpName , 'page' , 'page.json', 'page/' + pageName + '/' + pageName + '.json');

    this.fs.commit(function () {
      if (typeof cb === 'function') {
        cb(pageName);
      }
      console.log(chalk.green('    创建文件:' + 'page/' + pageName + '/' + pageName + '.html'));
      console.log(chalk.green('    创建文件:' + cssFileName));
      console.log(chalk.green('    创建文件:' + 'page/' + pageName + '/' + pageName + '.js'));
      console.log(chalk.green('    创建文件:' + 'page/' + pageName + '/' + pageName + '.json'));
      console.log();
      console.log('    ' + chalk.bgGreen('页面' + pageName + '创建成功！'));
      console.log();
    }.bind(this));
  },

  create: function (cb) {
    this.talk(cb);
  }
});

module.exports = Page;
