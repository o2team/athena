'use strict';

var through2 = require('through2');
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

  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      var filePathObj = path.parse(file.path);
      var fileName = filePathObj.name;
      var combofile = config.fdPath + '/' + config.app + '/' + config.module + '/' + fileName + '.shtml';
      var fileContent = file.contents.toString();
      var fileList = [];
      var href = '//' + config.domain + '/c/=';
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
      if (config.fdPath.lastIndexOf('/') === 0) {
        config.fdPath = config.fdPath + '/';
      }
      links.each(function (i, item) {
        var combouse = config.fdPath + config.app + item['attribs']['combo-use'];
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

module.exports = combo;
