'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var inquirer = require('inquirer');
var uuid = require('uuid');

var Base = require('../base');
var Util = require('../../util');

var App = Base.extend({
  construct: function (options) {
    this.conf = _.assign({
      appName: null
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
    console.log(chalk.magenta('  Allo ' + this.userName + '! 我要开始创建项目了哟~'));
    console.log('  need help? go and open issue: https://github.com/o2team/athena-html/issues/new');
  },

  talk: function (cb , opts) {
    var prompts = [];
    var conf = this.conf;
    if (fs.existsSync(conf.appName)) {
      prompts.push({
        type: 'input',
        name: 'appName',
        message: '已经存在了同名项目哦，换个名称吧~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(input)) {
            return '还是有同名项目哦，换个名字吧~';
          }
          return true;
        }
      });
    }
    if (typeof conf.appName !== 'string') {
      prompts.push({
        type: 'input',
        name: 'appName',
        message: '请输入项目名称~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(input)) {
            return '项目已经存在哦，换个名字吧~';
          }
          return true;
        }
      });
    }

    prompts.push({
      type: 'input',
      name: 'appDescription',
      message: '请输入项目描述，尽量简短哟~'
    });

    if (!this.userName) {
      prompts.push({
        type: 'input',
        name: 'author',
        message: '雁过留声，人过留名~~'
      });
    }

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

    var tmpchoices = [];

    opts.templatesinfo.items.forEach(function(o,i){
      tmpchoices.push({
        name : o.name,
        value: o._id
      })
    })

    prompts.push({
      type: 'list',
      name: 'tmpId',
      message: '请选择项目模板：',
      choices: tmpchoices
    });

    inquirer.prompt(prompts, function (answers) {
      answers.appName = answers.appName || conf.appName;
      if (!answers.author) {
        answers.author = this.userName;
      }
      this.gConfig.user_name = answers.author;
      if (this.needSetUsername) {
        Util.setConfig(this.gConfig);
      }
      answers.date = ((new Date()).getFullYear()) + '-' + ((new Date()).getMonth() + 1) + '-' + ((new Date()).getDate());
      this.write(answers, cb);
    }.bind(this));
  },

  write: function (options, cb) {
    this.conf = _.assign({
      appName: null,
      date: null,
      author: null,
      tmpId: 'default'
    }, options);
    var conf = this.conf;
    var commonModule = conf.appName + '/' + 'gb';

    conf.appId = uuid.v1();
    conf.commonModuleId = uuid.v1();
    this.mkdir(conf.appName);
    this.mkdir(commonModule);
    this.mkdir(commonModule + '/page');
    this.mkdir(commonModule + '/static');
    this.mkdir(commonModule + '/static/css');
    this.mkdir(commonModule + '/static/images');
    this.mkdir(commonModule + '/static/js');
    if (conf.cssPretreatment === 'sass') {
      this.mkdir(commonModule + '/static/sass');
    } else if (conf.cssPretreatment === 'less') {
      this.mkdir(commonModule + '/static/less');
    }
    this.mkdir(commonModule + '/widget');
    this.mkdir(commonModule + '/page/gb');

    this.copy(options.tmpId ,'app', '_gb.css', commonModule + '/page/gb/gb.css');
    this.copy(options.tmpId ,'app', '_gb.js', commonModule + '/page/gb/gb.js');
    this.copy(options.tmpId ,'app', '_gb.html', commonModule + '/page/gb/gb.html');
    if (conf.cssPretreatment === 'sass') {
      this.copy(options.tmpId ,'app', '_common.scss', commonModule + '/static/sass/_common.scss');
    }
    this.copy(options.tmpId ,'app', '_module-conf.js', commonModule + '/module-conf.js');
    this.copy(options.tmpId ,'app', '_static-conf.js', commonModule + '/static-conf.js');

    this.copy(options.tmpId ,'app', '_app-conf.js', conf.appName + '/app-conf.js');
    this.copy(options.tmpId ,'app', 'editorconfig', conf.appName + '/.editorconfig');

    this.fs.commit(function () {
      if (typeof cb === 'function') {
        cb(conf.appName);
      }
      console.log(chalk.green('    创建文件:' + commonModule + '/page/gb/gb.css'));
      console.log(chalk.green('    创建文件:' + commonModule + '/page/gb/gb.js'));
      console.log(chalk.green('    创建文件:' + commonModule + '/page/gb/gb.html'));
      if (conf.cssPretreatment === 'sass') {
        console.log(chalk.green('    创建文件:' + commonModule + '/static/sass/_common.scss'));
      }
      console.log(chalk.green('    创建文件:' + commonModule + '/module-conf.js'));
      console.log(chalk.green('    创建文件:' + commonModule + '/static-conf.js'));
      console.log(chalk.green('    创建文件:' + conf.appName + '/.editorconfig'));
      console.log(chalk.green('    创建文件:' + conf.appName + '/app-conf.js'));
      console.log();
      console.log('    ' + chalk.bgGreen('项目' + conf.appName + '创建成功！'));
      console.log();
      console.log(chalk.yellow('    请执行 cd ' + conf.appName + ' 进入到项目下开始工作吧！'));
      console.log();
    }.bind(this));
  },

  create: function (cb) {
    var that = this;
    this.getRemoteConf(function(templatesinfo){


      that.talk(cb, {
        templatesinfo: templatesinfo || {}
      });
    });


  }
});

module.exports = App;
