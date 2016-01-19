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
    this.appConfPath = this.destinationPath('..', 'app-conf.js');
    console.log(chalk.magenta('  Allo ' + this.userName + '! 我要开始创建组件了哟~'));
    console.log('  need help? go and open issue: https://github.com/o2team/athena/issues/new');
  },

  talk: function (cb) {
    var prompts = [];
    var userHome = Util.homedir();
    var userName = path.basename(userHome);
    var conf = this.conf;
    this.moduleConf = require(this.destinationPath('module-conf'));

    if (typeof conf.widgetName !== 'string') {
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
    } else if (fs.existsSync(this.destinationPath('widget', conf.widgetName))) {
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
    if (!this.userName) {
      prompts.push({
        type: 'input',
        name: 'author',
        message: '雁过留声，人过留名~~'
      });
    }

    if (typeof conf.description !== 'string') {
      prompts.push({
        type: 'input',
        name: 'description',
        message: '这个widget是用来干嘛的呢~~',
      });
    }

    if (conf.sass === undefined && conf.less === undefined) {
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
    }

    inquirer.prompt(prompts, function(answers) {
      if (!answers.author) {
        answers.author = this.userName;
      }
      this.gConfig.user_name = answers.author;
      if (this.needSetUsername) {
        Util.setConfig(this.gConfig);
      }
      if (conf.sass) {
        answers.cssPretreatment = 'sass';
      } else if (conf.less) {
        answers.cssPretreatment = 'less';
      }
      _.assign(this.conf, answers);
      this.conf.date = ((new Date()).getFullYear()) + '-' + ((new Date()).getMonth() + 1) + '-' + ((new Date()).getDate());
      this.conf.modName = this.moduleConf.module;
      this.conf.modClassName = Util.classify(this.conf.modName);
      this.conf.appName = this.moduleConf.app;
      this.write(cb);
    }.bind(this));
  },

  write: function (cb) {
    // 创建目录
    var conf = this.conf;
    var appConf = require(this.appConfPath);
    var conf = this.conf;
    conf.tmpId = appConf.tmpId ? appConf.tmpId : 'default';
    var widgetName = conf.widgetName;
    var cssFileName = '';
    this.mkdir('widget/' + widgetName);
    this.mkdir('widget/' + widgetName + '/images');
    this.writeGitKeepFile('widget/' + widgetName + '/images');
    this.copy(conf.tmpId , 'widget','widget.html', 'widget/' + widgetName + '/' + widgetName + '.html');
    if (conf.cssPretreatment === 'sass') {
      cssFileName = 'widget/' + widgetName + '/' + widgetName + '.scss';
    } else if (conf.cssPretreatment === 'less') {
      cssFileName = 'widget/' + widgetName + '/' + widgetName + '.less';
    } else {
      cssFileName = 'widget/' + widgetName + '/' + widgetName + '.css';
    }
    this.copy(conf.tmpId , 'widget','widget.css', cssFileName);
    this.copy(conf.tmpId , 'widget','widget.js', 'widget/' + widgetName + '/' + widgetName + '.js');
    this.copy(conf.tmpId , 'widget','widget.json', 'widget/' + widgetName + '/' + widgetName + '.json');

    this.fs.commit(function () {
      if (typeof cb === 'function') {
        cb(widgetName);
      }
      console.log(chalk.green('    创建文件:' + 'widget/' + widgetName + '/' + widgetName + '.html'));
      console.log(chalk.green('    创建文件:' + cssFileName));
      console.log(chalk.green('    创建文件:' + 'widget/' + widgetName + '/' + widgetName + '.js'));
      console.log(chalk.green('    创建文件:' + 'widget/' + widgetName + '/' + widgetName + '.json'));
      console.log();
      console.log('    ' + chalk.bgGreen('组件' + widgetName + '创建成功！'));
      console.log();
    }.bind(this));
  },

  create: function (cb) {
    var that = this;
    this.getRemoteConf(function(){
      that.talk(cb);
    });
  }
});

module.exports = Widget;
