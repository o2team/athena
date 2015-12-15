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
  template: function (source, dest, data, options) {
    if (typeof dest !== 'string') {
      options = data;
      data = dest;
      dest = source;
    }
    this.fs.copyTpl(
      this.templatePath(source),
      this.destinationPath(dest),
      data || this,
      options
    );
    return this;
  },

  // 拷贝
  copy: function (type, source, dest) {

    dest = dest || source;
    source = this.templatePath(type, source);
    var headers = readChunk.sync(source, 0, 512);
    if (istextorbinary.isBinarySync(undefined, headers)) {
      this.fs.copy(source, this.destinationPath(dest));
    } else {
      this.template(source, dest);
    }
    return this;
  },

  // 获取远程配置

  getRemoteConf: function (cbk) {

    request.get('http://athena.hamioo.me/api/templates', function(err, res, body){


      if (!err && res.statusCode == 200) {
        var body = JSON.parse(body);

        var templatesVersion = body.data.version;

        console.log(templatesVersion,123)
        console.log(body);
        cbk(body);

      }
    })


  }
});

module.exports = Base;
