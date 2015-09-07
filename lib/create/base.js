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

var Base = Class.extend({
  construct: function () {
    this.sharedFs = memFs.create();
    this.fs = FileEditor.create(this.sharedFs);
    this.sourceRoot(path.join(this.resolved, 'templates'));
  },

  mkdir: function () {
    mkdirp.sync.apply(mkdirp, arguments);
  },

  sourceRoot: function (rootPath) {
    if (typeof rootPath === 'string') {
      this._sourceRoot = path.resolve(rootPath);
    }

    return this._sourceRoot;
  },

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

  copy: function (source, dest) {
    dest = dest || source;
    source = this.templatePath(source);
    var headers = readChunk.sync(source, 0, 512);
    if (istextorbinary.isBinarySync(undefined, headers)) {
      this.fs.copy(source, this.destinationPath(dest));
    } else {
      this.template(source, dest);
    }
    return this;
  }
});

module.exports = Base;
