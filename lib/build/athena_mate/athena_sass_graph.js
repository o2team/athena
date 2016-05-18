/**
* @fileoverview 扫描得出sass文件通过@import引用的依赖关系
* @author  liweitao
*/

'use strict';

var fs = require('fs');
var path = require('path');
var through2 = require('through2');
var _ = require('lodash');
var glob = require('glob');

var Util = require('../../util');

function generateSassPath (fp, imports) {
  var res = [];
  imports.forEach(function (item) {
    var find = glob.sync(path.join(fp, '**', '?(_)' + item + '.+(scss|sass)'), {});
    res = res.concat(find);
  });
  return res;
}

module.exports = function (opts) {
  opts = _.assign({
    cwd: null,
    app: null,
    module: null,
    map: 'sass_graph.json'
  }, opts);
  var sassGraphPath = path.join(opts.cwd, opts.module, 'dist', opts.map);
  var sassGraphJson = Util.readJsonFile(sassGraphPath);
  
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull() || file.isStream()) {
      return callback(null, file);
    }

    if (file.isBuffer()) {
      var imports = Util.sassImports(file.contents);
      var importsPaths = generateSassPath(path.join(opts.cwd, '*', 'dist', '_'), imports);
      sassGraphJson[file.path] = sassGraphJson[file.path] || {};
      sassGraphJson[file.path].imported = importsPaths;
      this.push(file);
      callback();
    }
  }, function (callback) {
    fs.writeFileSync(sassGraphPath, JSON.stringify(sassGraphJson, null, 2));
    callback();
  });

  return stream;
};
