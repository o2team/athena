/**
* @fileoverview 创建app类
* @author  liweitao@jd.com
*/

'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var inquirer = require('inquirer');
var uuid = require('uuid');
var del = require('del');

var Base = require('../base');
var Util = require('../../util');

/**
 * @class App
 * @classdesc App类
 */
var App = Base.extend({

  /**
   * @constructor
   * @param {Object} options
   * @param {String} [options.appName] - 项目名称
   * @param {String} [options.description] - 项目描述
   * @param {Boolean} [options.sass] - 是否使用sass
   * @param {Boolean} [options.less] - 是否使用less
   */
  construct: function (options) {
    this.conf = _.assign({
      appName: null,
      description: '',
      sass: false,
      less: false
    }, options);
    this.super.apply(this, arguments);
    this.init();
  },

  /**
   * @description 初始化
   */
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
    console.log('  need help? go and open issue: https://github.com/o2team/athena/issues/new');
  },

  /**
   * @description 输出询问信息
   * @param {Function} cb - 输入完后的回调
   * @param {Object} opts
   */
  talk: function (cb , opts) {
    var prompts = [];
    var conf = this.conf;
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
    } else if (fs.existsSync(conf.appName)) {
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

    if (typeof conf.description !== 'string') {
      prompts.push({
        type: 'input',
        name: 'appDescription',
        message: '请输入项目描述，尽量简短哟~'
      });
    }

    if (!this.userName) {
      prompts.push({
        type: 'input',
        name: 'author',
        message: '雁过留声，人过留名~~'
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

    var tmpchoices = [];

    opts.templatesinfo.items.forEach(function(o,i){
      tmpchoices.push({
        name : o.name,
        // value: o._id
        value: o.name
      })
    })

    if (typeof conf.tmpName !== 'string') {
      prompts.push({
        type: 'list',
        name: 'tmpName',
        message: '请选择项目模板：',
        choices: tmpchoices
      });
    }

    inquirer.prompt(prompts, function (answers) {
      if (typeof conf.description === 'function') {
        conf.description = '';
      }
      answers.appName = answers.appName || conf.appName;
      answers.appDescription = answers.appDescription || conf.description;
      answers.tmpName = answers.tmpName || conf.tmpName;
      if (conf.sass) {
        answers.cssPretreatment = 'sass';
      } else if (conf.less) {
        answers.cssPretreatment = 'less';
      }
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

  /**
   * @description 创建目录，拷贝模板
   * @param {Object} options
   * @param {String} [options.appName] - 项目名称
   * @param {String} [options.date] - 创建日期
   * @param {String} [options.author] - 作者
   * @param {String} [options.tmpName] - 模板名称
   * @param {Function} cb - 创建完后的回调
   */
  write: function (options, cb) {
    this.conf = _.assign({
      appName: null,
      date: null,
      author: null,
      tmpName: '默认模板'
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
    this.writeGitKeepFile(commonModule + '/static/css');
    this.mkdir(commonModule + '/static/images');
    this.writeGitKeepFile(commonModule + '/static/images');
    this.mkdir(commonModule + '/static/js');
    this.writeGitKeepFile(commonModule + '/static/js');
    if (conf.cssPretreatment === 'sass') {
      this.mkdir(commonModule + '/static/sass');
      this.writeGitKeepFile(commonModule + '/static/sass');
    } else if (conf.cssPretreatment === 'less') {
      this.mkdir(commonModule + '/static/less');
      this.writeGitKeepFile(commonModule + '/static/less');
    }
    this.mkdir(commonModule + '/widget');
    this.writeGitKeepFile(commonModule + '/widget');
    this.mkdir(commonModule + '/page/gb');

    this.copy(options.tmpName ,'app', '_gb.css', commonModule + '/page/gb/gb.css');
    this.copy(options.tmpName ,'app', '_gb.js', commonModule + '/page/gb/gb.js');
    this.copy(options.tmpName ,'app', '_gb.html', commonModule + '/page/gb/gb.html');
    if (conf.cssPretreatment === 'sass') {
      this.copy(options.tmpName ,'app', '_common.scss', commonModule + '/static/sass/_common.scss');
    }
    this.copy(options.tmpName ,'app', '_module-conf.js', commonModule + '/module-conf.js');
    this.copy(options.tmpName ,'app', '_static-conf.js', commonModule + '/static-conf.js');

    this.copy(options.tmpName ,'app', '_app-conf.js', conf.appName + '/app-conf.js');
    this.copy(options.tmpName ,'app', 'editorconfig', conf.appName + '/.editorconfig');

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

  /**
   * @description 创建项目
   * @param {Function} cb - 创建完后的回调
   */
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
