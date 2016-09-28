/**
* @fileoverview 创建widget类
* @author  liweitao
*/

'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var inquirer = require('inquirer');
var Base = require('../base');
var Util = require('../../util');
var request = require('request');
var del = require('del');
var setting = Util.getSetting();
var glob = require('glob');
var Glob = glob.Glob;
var vfs = require('vinyl-fs');
var path = require('path');
var es  = require('event-stream');
var gutil = require('gulp-util');

/**
 * @class Widget
 * @classdesc Widget类
 */
var Widget = Base.extend({
  /**
   * @constructor
   * @param {Object} options
   * @param {String} [options.widgetName] - 组件名称
   * @param {String} [options.description] - 组件描述
   * @param {Boolean} [options.sass] - 是否使用sass
   * @param {Boolean} [options.less] - 是否使用less
   * @param {Boolean} [options.cms] - 是否是cms使用的楼层
   */
  construct: function (options) {
    this.conf = _.assign({
      widgetName: null
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
    console.log(chalk.magenta('  Allo ' + this.userName + '! 我要开始创建组件了哟~'));
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
            return '组件已经存在当前模块widget目录中了，换个名字吧~';
          }
          return true;
        }.bind(this)
      });
    } else if (fs.existsSync(this.destinationPath('widget', conf.widgetName))) {
      prompts.push({
        type: 'input',
        name: 'widgetName',
        message: '组件已经存在当前模块widget目录中了，换个名字吧~',
        validate: function(input) {
          if (!input) {
            return '不能为空哦，会让人家很为难的~';
          }
          if (fs.existsSync(this.destinationPath('widget', input))) {
            return '组件已经存在当前模块widget目录中了，换个名字吧~';
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
    
    if (conf.cms === undefined) {
      prompts.push({
        type: 'confirm',
        name: 'cms',
        message: '是否是用于CMS的楼层',
        default: false
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

  /**
   * @description 创建目录，拷贝模板
   * @param {Function} cb - 创建完后的回调
   */
  write: function (cb) {
    // 创建目录
    var conf = this.conf;
    var appConf = require(this.appConfPath);
    var conf = this.conf;
    conf.tmpName = appConf.tmpName || undefined;
    conf.tmpId = appConf.tmpId ? appConf.tmpId : this.getTmpIdByTmpName(conf.tmpName);
    var widgetName = conf.widgetName;
    var cssFileName = '';
    this.mkdir('widget/' + widgetName);
    this.mkdir('widget/' + widgetName + '/images');
    this.writeGitKeepFile('widget/' + widgetName + '/images');
    if (!conf.cms) {
      this.copy({tmpName:conf.tmpName, tmpId:conf.tmpId}, 'widget','widget.html', 'widget/' + widgetName + '/' + widgetName + '.html');
    } else {
      this.copy({tmpName:conf.tmpName, tmpId:conf.tmpId}, 'widget','widget_cms.html', 'widget/' + widgetName + '/' + widgetName + '.html');
      this.copy({tmpName:conf.tmpName, tmpId:conf.tmpId}, 'widget','data.json', 'widget/' + widgetName + '/' + 'data.json');
    }
    if (conf.cssPretreatment === 'sass') {
      cssFileName = 'widget/' + widgetName + '/' + widgetName + '.scss';
    } else if (conf.cssPretreatment === 'less') {
      cssFileName = 'widget/' + widgetName + '/' + widgetName + '.less';
    } else {
      cssFileName = 'widget/' + widgetName + '/' + widgetName + '.css';
    }
    this.copy({tmpName:conf.tmpName, tmpId:conf.tmpId}, 'widget','widget.css', cssFileName);
    this.copy({tmpName:conf.tmpName, tmpId:conf.tmpId}, 'widget','widget.js', 'widget/' + widgetName + '/' + widgetName + '.js');
    this.copy({tmpName:conf.tmpName, tmpId:conf.tmpId}, 'widget','widget.json', 'widget/' + widgetName + '/' + widgetName + '.json');

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

  /**
   * @description 创建项目
   * @param {Function} cb - 创建完后的回调
   */
  create: function (cb) {
    var that = this;
    this.getRemoteConf(function(){
      that.talk(cb);
    });
  },
  
  /**
   * @description 加载远程组件
   * @param {String} remoteUrl - 远程URL
   * @param {Function} cb - 创建完后的回调
   */
  loadRemote: function (remoteUrl,widgetAlias, cb) {
    var that = this;
    var tarpath = 'widget/' + that.conf.widgetName;
    var req = request.get(remoteUrl);

    var tmpzip = '_tempzip';
    req
      .pipe(fs.createWriteStream(tmpzip))
      .on('finish', function() {
        var decompress = require('decompress');
        decompress(tmpzip, tarpath).then(function(files) {
          del.sync(tmpzip, { force: true });
          // 安置SASS依赖
          if(Util.existsSync(path.join(tarpath, '_imports'))) {
            var importsPath = path.join(tarpath, '_imports');
            var destPath = path.resolve(tarpath, '../../', 'static', 'css');
            var destGbPath = path.resolve(tarpath, '../../../gb/static', '@(scss|sass|css)');  //
            var hasWarn = false;
            function move (directory) {
              var files = glob.sync(path.join(directory, '/*'));
              files.forEach(function(file, index) {
                var relativePath = path.relative(importsPath, file);
                var destFile = path.join(destPath, relativePath);
                var destGbFiles = glob.sync(path.join(destGbPath, relativePath), {});
                var isDirectory = fs.statSync(file).isDirectory();
                
                if(!isDirectory && destGbFiles.length > 0) {
                  console.log(chalk.yellow('  gb下已存在文件 ' + relativePath));
                  return;
                }
                
                if(!Util.existsSync(destFile)) {
                  fs.renameSync(file, destFile);
                } else if(!isDirectory) {
                  hasWarn = true;
                  console.log(chalk.yellow('  模块下已存在文件 ' + relativePath));
                } else {
                  move(file);
                }
              });
            }
            move(importsPath);
            // if(hasWarn) {
            //   console.log(chalk.red('  请到 ' + importsPath + ' 下处理冲突的文件'));
            // } else {
            //   fs.rmdirSync(importsPath);
            // }
            // 不管有没有冲突，皆删之
            Util.rmfolder(importsPath);
          }
           if(typeof(widgetAlias) === 'string'){
               that.existsFilesAndRename('.html',tarpath);
               that.existsFilesAndRename('.scss',tarpath);
               that.existsFilesAndRename('.css',tarpath);
               that.existsFilesAndRename('.less',tarpath);
               that.existsFilesAndRename('.json',tarpath);
               that.existsFilesAndRename('.js',tarpath);
           }
           cb && cb(that.conf.widgetName);
           console.log();
           console.log('    ' + chalk.bgGreen('组件' + that.conf.widgetName + '在当前项目下加载成功'));
           console.log();  
        });
      });
  },
  // 判断文件是否存在
  existsFilesAndRename: function(str,tarpath){
      var that = this;
      var files = new Glob(path.join(tarpath, '*' + str), {mark: true, sync:true});
      if(files.matches[0]){
          _.forEach(files.matches[0],function(n,key){
              files.path = key;
          });
          fs.renameSync(files.path, path.join(tarpath,that.conf.widgetName + str));
      }
  },
  renameContent: function(widgetName, widgetOriginName){
    var modulePath = process.cwd();
    var pattern = new RegExp(widgetOriginName,'g');
    vfs.src(path.join(modulePath, 'widget', widgetName, '*.{js,scss,html,json}'))
    .pipe(
        es.map(function (data, callback) {
             var dataReplace = data['_contents'].toString().replace(pattern, widgetName);
             data['_contents'] = new Buffer(dataReplace);
             callback(null, data);
        })
    )
    .pipe(vfs.dest(path.join(modulePath, 'widget', widgetName)));
  }
});
module.exports = Widget;
