'use strict';

var through = require('through-gulp');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');
var cheerio = require('cheerio');

var config = {};

function combo (opts) {
  config = _.assign({
    app: null,
    module: null,
    cwd: null,
    fdPath: null,
    domain: null
  }, opts);
  var modulePath = path.join(config.cwd, config.module);
  var moduleMapJsonPath = path.join(modulePath, 'dist', 'map.json');
  var commonMapJsonPath = path.join(config.cwd, 'gb', 'dist', 'map.json');
  var moduleMapJson = JSON.parse(fs.readFileSync(moduleMapJsonPath).toString());
  var commonMapJson = JSON.parse(fs.readFileSync(commonMapJsonPath).toString());

  var stream = through(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var filePathObj = path.parse(file.path);
      var fileName = filePathObj.name;
      var combofile = config.fdPath + '/' + config.app + '/' + config.module + '/' + fileName + '.shtml';
      var fileContent = file.contents.toString();
      var fileList = [];
      var href = 'http://' + config.domain + '/c/=';
      var newFileContent = '';
      var $ = cheerio.load(fileContent, { decodeEntities: false });
      var headChildren = $('head').contents();

      headChildren.each(function (i, item) {
        var nodeType = item.nodeType;
        if (nodeType === 8 && /global|combo/.test(item.data)) {
          $(item).remove();
        }

      });
      var links = $('link[rel=stylesheet]');
      links.each(function (i, item) {
        var combouse = config.fdPath + '/' + config.app + item['attribs']['combo-use'];
        if (/\/gb\//.test(combouse)) {
          combouse = getHashName(combouse, commonMapJson);
        } else {
          combouse = getHashName(combouse, moduleMapJson);
        }

        href += combouse;
        if (i === links.length - 1) {
          href += '';
        } else {
          href += ',';
        }
      });
      links.remove();
      file.contents = new Buffer(beautifyHtml($.html(), { indent_size: 2, max_preserve_newlines: 1 }));
      this.push(file);
      newFileContent = _.template('<link combofile="<%= combofile %>" rel="stylesheet" href="<%= href %>" />')({
        combofile: combofile,
        href: href
      });
      var newFile = new gutil.File({
        path: fileName + '.shtml',
        contents: new Buffer(newFileContent)
      });
      this.push(newFile);
      callback();
    } else if (file.isStream()){

      return callback(null, file);
    }
  }, function (callback) {

    callback();
  });
  return stream;
}

function getHashName (id, mapJson) {
  var ext = path.extname(id);
  var dirname = path.dirname(id);
  var name = path.basename(id);
  var rev = mapJson.rev;
  var revByType = null;
  if (!rev) {
    return id;
  }
  if (/\js/.test(ext)) {
    revByType = rev.js;
  } else if (/css/.test(ext)) {
    revByType = rev.css;
  } else if (/png|jpg|jpeg|gif/.test(ext)) {
    revByType = rev.img
  }

  if (!revByType || !revByType[name]) {
    return id;
  }
  return path.join(dirname, revByType[name]);
}

module.exports = {
  combo: combo,
  getHashName: getHashName
};
