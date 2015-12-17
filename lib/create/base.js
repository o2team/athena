'use strict'

var mkdirp = require('mkdirp');
var memFs = require('mem-fs');
var FileEditor = require('mem-fs-editor');
var path = require('path');
var fs = require('fs');
var Class = require('../class');
var pathIsAbsolute = require('path-is-absolute');
var pathExists = require('path-exists');
var readChunk = require('read-chunk');
var istextorbinary = require('istextorbinary');
var request = require('request');
var unzip = require('unzip');

var Util = require('../util');
var config = Util.getSetting();



function readCache(path){
  var _cache = {
    version : 0,
    items : [{
      name : '默认模板',
      _id  : 'default',
      desc : '默认模板'
    }]
  };

  if(!fs.existsSync(path)){
    writeCache(_cache, path);
  }
  var _cache = fs.readFileSync(path,'utf8');
    _cache = JSON.parse(_cache);
  return _cache;
}

function writeCache(content, _path){
  fs.writeFileSync(_path, JSON.stringify(content), 'utf8');
}

var Base = Class.extend({
  construct: function () {
    this.sharedFs = memFs.create();
    this.fs = FileEditor.create(this.sharedFs);

    this.sourceRoot(path.join(this.resolved, '../templates'));
  },

  mkdir: function () {
    mkdirp.sync.apply(mkdirp, arguments);
  },

  // 资源根路径
  sourceRoot: function (rootPath) {
    if (typeof rootPath === 'string') {
      this._sourceRoot = path.resolve(rootPath);
    }

    return this._sourceRoot;
  },

  // 模板路径
  templatePath: function () {
    var filepath = path.join.apply(path, arguments);
    if (!pathIsAbsolute(filepath)) {
      filepath = path.join(this.sourceRoot(), filepath);
    }
    return filepath;
  },
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
  destinationPath: function () {
    var filepath = path.join.apply(path, arguments);

    if (!pathIsAbsolute(filepath)) {
      filepath = path.join(this.destinationRoot(), filepath);
    }

    return filepath;
  },

  // 渲染模板
  template: function (tmpname, type, source, dest, data, options) {
    if (typeof dest !== 'string') {
      options = data;
      data = dest;
      dest = source;
    }
    this.fs.copyTpl(
      this.templatePath(tmpname, type, source),
      this.destinationPath(dest),
      data || this,
      options
    );
    return this;
  },

  // 拷贝
  copy: function (tmpname, type, source, dest) {
    dest = dest || source;
    var _source = this.templatePath(tmpname, type, source);

    var headers = readChunk.sync(_source, 0, 512);
    if (istextorbinary.isBinarySync(undefined, headers)) {
      this.fs.copy(_source, this.destinationPath(dest));
    } else {
      this.template(tmpname, type, source, dest);
    }
    return this;
  },

  // 获取远程配置

  getRemoteConf: function (cbk) {
    var that = this;
    var cache = readCache(path.join(that.sourceRoot(), '_cache.json'));
    request.get(config.report_url + '/api/templates', function(err, res, body){
      // 获取到更新则同步
      if (!err && res.statusCode == 200) {
        var body = JSON.parse(body);
        var templatesVersion = body.data.version;
        if(templatesVersion == cache.version) {
          cbk(cache);
        }else {
          cache = body.data;
          Util.rmfolder(that.sourceRoot() , true);
          // 下载新的模板
          request(config.report_url + '/api/template/download ')
          .pipe(unzip.Extract({ path: that.sourceRoot() }));

          writeCache(cache , path.join(that.sourceRoot(), '_cache.json'))
          cbk(cache);
        }
      }else {
        // console.log('未能从服务端同步到最新的模板，请检查异常！')
        cbk(cache);
      }
    });
  }
});

module.exports = Base;
