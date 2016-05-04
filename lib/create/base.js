/**
* @fileoverview 创建的基类
* @author  liweitao@jd.com
*/

'use strict';

var mkdirp = require('mkdirp');
var memFs = require('mem-fs');
var FileEditor = require('mem-fs-editor');
var path = require('path');
var fs = require('fs');
var del = require('del');
var pathIsAbsolute = require('path-is-absolute');
var pathExists = require('path-exists');
var request = require('request');
var unzip = require('unzip');
var crypto = require('crypto');
var chalk = require('chalk');

var wrench = require('../util/wrench');
var Class = require('../class');
var Util = require('../util');

var setting = Util.getSetting();

// 用于缓存模板JSON列表以快速查询
var _onceReadCache = {waitInit:true};

/**
 * 读取模板缓存
 */
function readCache (path) {
  var _cache = {
    version : 0,
    items : [{
      name : '默认模板',
      _id  : 'default',
      desc : '默认模板'
    }]
  };

  if (!fs.existsSync(path)) {
    writeCache(_cache, path);
  }
  _cache = fs.readFileSync(path,'utf8');
  _cache = JSON.parse(_cache);
  return _cache;
}

/**
 * 写入模板缓存
 */
function writeCache (content, _path) {
  fs.writeFileSync(_path, JSON.stringify(content), 'utf8');
}

/**
 * 文件md5
 */
function md5File (filename, callback) {
  var sum = crypto.createHash('md5');
  if (callback && typeof callback === 'function') {
    var fileStream = fs.createReadStream(filename);
    fileStream.on('error', function (err) {
      return callback(err, null);
    });
    fileStream.on('data', function (chunk) {
      try {
        sum.update(chunk);
      } catch (ex) {
        return callback(ex, null);
      }
    });
    fileStream.on('end', function () {
      return callback(null, sum.digest('hex'));
    });
  } else {
    sum.update(fs.readFileSync(filename));
    return sum.digest('hex');
  }
}

/**
* @class Base
* @classdesc Base类
*/
var Base = Class.extend({

  /**
   * @constructor
   */
  construct: function () {
    this.sharedFs = memFs.create();
    this.fs = FileEditor.create(this.sharedFs);
    this.sourceRoot(path.join(Util.getAthenaPath(), 'tmp'));
  },

  /**
   * @description 创建目录
   */
  mkdir: function () {
    mkdirp.sync.apply(mkdirp, arguments);
  },

  /**
   * @description 向目录下写入git占位文件
   * @param {String} dirname 目录相对路径
   */
  writeGitKeepFile: function (dirname) {
    var dirname = path.resolve(dirname);
    fs.writeFileSync(path.join(dirname, '.gitkeep'), '这只是个占位文件，嘿嘿嘿~\n若当前目录下已有项目文件，可以删除之~', 'utf8');
  },

  /**
   * @description 资源根路径
   * @param {String} rootPath 资源根目录
   * @return {String} 资源根路径
   */
  sourceRoot: function (rootPath) {
    if (typeof rootPath === 'string') {
      this._sourceRoot = path.resolve(rootPath);
    }
    if(!fs.existsSync(this._sourceRoot)){
      this.mkdir(this._sourceRoot);
    }
    return this._sourceRoot;
  },

  /**
   * @description 获取模板路径
   * @return {String} 模板路径
   */
  templatePath: function () {
    var filepath = path.join.apply(path, arguments);
    if (!pathIsAbsolute(filepath)) {
      filepath = path.join(this.sourceRoot(), 'templates' , filepath);
    }
    return filepath;
  },

  /**
   * @description 获取生成代码的根目录
   * @param {String} rootPath 根目录
   * @return {String} 路径
   */
  destinationRoot: function (rootPath) {
    if (typeof rootPath === 'string') {
      this._destinationRoot = path.resolve(rootPath);

      if (!pathExists.sync(rootPath)) {
        mkdirp.sync(rootPath);
      }

      process.chdir(rootPath);
    }
    return this._destinationRoot || process.cwd();
  },

  /**
   * @description 获取生成代码的目标路径
   * @return {String} 路径
   */
  destinationPath: function () {
    var filepath = path.join.apply(path, arguments);
    if (!pathIsAbsolute(filepath)) {
      filepath = path.join(this.destinationRoot(), filepath);
    }

    return filepath;
  },

  /**
   * @description 渲染模板
   * @param {String} tmpname 模板名称
   * @param {String} type 创建类型，如app
   * @param {String} source 模板文件名
   * @param {String} dest 生成目标文件路径
   * @param {Object} data 模板数据
   * @param {Object} options 生成选项
   * @return {Object} this
   */
  template: function (tmpname, type, source, dest, data, options) {
    var that = this;
    if (typeof dest !== 'string') {
      options = data;
      data = dest;
      dest = source;
    }
    
    // 通过tempname从快速缓存中获取到tempId
    if(_onceReadCache.waitInit) {
      var cache = readCache(path.join(that.sourceRoot(), '_cache.json'));
      var items = cache.items;
      items.forEach(function(item) {
        _onceReadCache[item.name] = item._id;
      });
      _onceReadCache.waitInit = false;
    }
    tmpname = _onceReadCache[tmpname];

    this.fs.copyTpl(
      this.templatePath(tmpname, type, source),
      this.destinationPath(dest),
      data || this,
      options
    );
    return this;
  },

  /**
   * @description 拷贝并渲染模板
   * @param {String} tmpname 模板名称
   * @param {String} type 创建类型，如app
   * @param {String} source 模板文件名
   * @param {String} dest 生成目标文件路径
   * @return {Object} this
   */
  copy: function (tmpname, type, source, dest) {
    dest = dest || source;
    this.template(tmpname, type, source, dest);
    return this;
  },

  /**
   * @description 获取远程配置
   * @param {function} cbk
   * @return {Object} this
   */
  getRemoteConf: function (cbk) {
    var that = this;
    var cache = readCache(path.join(that.sourceRoot(), '_cache.json'));
    request.get(setting.report_url + '/api/templates', function(err, res, body) {
      // 获取到更新则同步
      if (!err && res.statusCode === 200) {
        var body = JSON.parse(body);
        var templatesVersion = body.data.version;
        if (templatesVersion === cache.version) {
          cbk(cache);
        } else {
          // 下载新的模板
          var _tmppath = path.join(that.sourceRoot(), 'templates.zip');
          try {
            console.log(chalk.green('  正在下载最新的模板，请稍等...'));
            request(setting.report_url + '/api/template/download')
            .pipe(fs.createWriteStream(_tmppath))
            .on('finish',function(){
              md5File(_tmppath, function(err, sum) {
                if (err || sum !== body.data.version) {
                  cbk(cache);
                  console.log('警告：验证zip包出错,请检查异常！');
                } else {
                  cache = body.data;

                  var templatesPath = path.join(that.sourceRoot(), 'templates');
                  var templatesTmpPath = path.join(that.sourceRoot(), 'templates_tmp');
                  var zip = unzip.Extract({ path: templatesTmpPath });

                  zip.on('close', function () {
                    Util.rmfolder(templatesPath, true);
                    wrench.copyDirSyncRecursive(templatesTmpPath, templatesPath, {
                      forceDelete: true
                    });
                    Util.rmfolder(path.join(that.sourceRoot(),'templates_tmp') , true);
                    writeCache(cache , path.join(that.sourceRoot(), '_cache.json'));
                    del.sync(_tmppath, { force: true });
                    cbk(cache);
                  })
                  .on('error', function (err) {
                    console.log(err);
                    cbk(cache);
                  });
                  fs.createReadStream(_tmppath)
                    .pipe(zip);
                }
              });
            });
          } catch(e) {
            that.setDefaultTmp();
            cbk(cache);
          }
        }
      } else {
        that.setDefaultTmp();
        console.log('警告：未能从服务端同步到最新的模板信息，请检查异常！');
        cbk(cache);
      }
    });
  },

  /**
   * @description 设置使用默认模板
   */
  setDefaultTmp: function () {
    var tmpPath = path.join(Util.getAthenaPath(), 'tmp', 'templates');
    if (!Util.existsSync(tmpPath)) {
      this.sourceRoot(path.join(__dirname));
    }
  }
});

module.exports = Base;
