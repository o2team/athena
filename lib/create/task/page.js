/**
* @fileoverview 创建page类
* @author  liweitao@jd.com
*/

'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var inquirer = require('inquirer');
var Base = require('../base');
var Util = require('../../util');

/**
 * @class Page
 * @classdesc Page类
 */
var Page = Base.extend({
  /**
   * @constructor
   * @param {Object} options
   * @param {String} [options.pageName] - 页面名称
   * @param {String} [options.description] - 页面描述
   * @param {Boolean} [options.sass] - 是否使用sass
   * @param {Boolean} [options.less] - 是否使用less
   */
  construct: function (options) {
    this.conf = _.assign({
      pageName: null,
      description: null
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
    this.appConfPath = this.destinationPath('..', 'app-conf.js');
    console.log(chalk.magenta('  Allo ' + this.userName + '! 我要开始创建页面了哦~'));
    console.log('  need help? go and open issue: https://github.com/o2team/athena/issues/new');
  },

  /**
   * @description 输出询问信息
   * @param {Function} cb - 输入完后的回调
   */
  talk: function (cb) {
    var prompts = [];
    var userHome = Util.homedir();
    var userName = path.basename(userHome);
    var conf = this.conf;
    this.moduleConf = require(this.destinationPath('module-conf'));
    if (typeof conf.pageName !== 'string') {
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
    } else if (fs.existsSync(this.destinationPath('page', conf.pageName))) {
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

    if (typeof conf.description !== 'string') {
      prompts.push({
        type: 'input',
        name: 'description',
        message: '这个页面是用来干嘛的呢？'
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
      this.conf.commonModule = this.moduleConf.common;
      this.conf.secondaryDomain = 's';
      this.write(cb);
    }.bind(this));
  },

  /**
   * @description 创建目录，拷贝模板
   * @param {Function} cb - 创建完后的回调
   */
  write: function (cb) {
    // 创建目录
    var conf = this.conf;
    var appConf = require(this.appConfPath);
    var conf = this.conf;
    conf.tmpId = appConf.tmpId ? appConf.tmpId : 'default';
    var pageName = conf.pageName;
    var cssFileName = '';
    this.mkdir('page/' + pageName);
    this.mkdir('page/' + pageName + '/images');
    this.writeGitKeepFile('page/' + pageName + '/images');
    this.template(conf.tmpId , 'page' , 'page.html', 'page/' + pageName + '/' + pageName + '.html', this, {
      delimiter: '$'
    });
    if (conf.cssPretreatment === 'sass') {
      cssFileName = 'page/' + pageName + '/' + pageName + '.scss';
    } else if (conf.cssPretreatment === 'less') {
      cssFileName = 'page/' + pageName + '/' + pageName + '.less';
    } else {
      cssFileName = 'page/' + pageName + '/' + pageName + '.css';
    }
    this.copy(conf.tmpId , 'page' , 'page.css', cssFileName);
    this.copy(conf.tmpId , 'page' , 'page.js', 'page/' + pageName + '/' + pageName + '.js');
    this.copy(conf.tmpId , 'page' , 'page.json', 'page/' + pageName + '/' + pageName + '.json');

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

  /**
   * @description 创建项目
   * @param {Function} cb - 创建完后的回调
   */
  create: function (cb) {
    var that = this;
    this.getRemoteConf(function(){
      that.talk(cb);
    });
  }
});

module.exports = Page;
