/**
* @fileoverview 生成CSS页面片
* @author  liweitao@jd.com
*/

'use strict';

var through2 = require('through2');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');
var cheerio = require('cheerio');

function combo (opts) {
  var config = _.assign({
    app: null,
    module: null,
    cwd: null,
    fdPath: null,
    domain: null,
    needCombo: false,
    needTimestamp: false
  }, opts);
  config.comboPrefix = opts.comboPrefix ? opts.comboPrefix : '/c/=';
  var modulePath = path.join(config.cwd, config.module);

  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      if (config.fdPath.lastIndexOf('/') === 0) {
        config.fdPath = config.fdPath + '/';
      }
      var filePathObj = path.parse(file.path);
      var fileName = filePathObj.name;
      var fileContent = file.contents.toString();
      var newFileContent = '';
      var $ = cheerio.load(fileContent, { decodeEntities: false });
      var headChildren = $('head').contents();

      headChildren.each(function (i, item) {
        var nodeType = item.nodeType;
        if (nodeType === 8 && /global:|endglobal/.test(item.data)) {
          $(item).remove();
        }
      });
      var links = $('link[rel=stylesheet]');
      if (config.needCombo) {
        var combofile = config.fdPath + config.app + '/' + config.module + '/' + fileName + '.shtml';
        var href = '//' + config.domain + config.comboPrefix;
        links.each(function (i, item) {
          var combouse = item['attribs']['combo-use'].replace('\/\/' + config.domain, '');
          href += combouse;
          if (i === links.length - 1) {
            href += '';
          } else {
            href += ',';
          }
        });
        if (config.needTimestamp) {
          href += '?t=' + new Date().getTime();
        }
        newFileContent = _.template('<link combofile="<%= combofile %>" rel="stylesheet" href="<%= href %>" />')({
          combofile: combofile,
          href: href
        });
      } else {
        var link = '';
        links.each(function (i, item) {
          var hrefText = item['attribs']['href'];
          if (config.needTimestamp) {
            hrefText += '?t=' + new Date().getTime();
          }
          var linkItem = _.template('<link rel="stylesheet" href="<%= href %>" />')({
            href: hrefText
          });
          link += linkItem;
          if (i === links.length - 1) {
            link += '';
          } else {
            link += '\n';
          }
        });
        newFileContent = link;
      }

      links.remove();
      file.contents = new Buffer(beautifyHtml($.html(), { indent_size: 2, max_preserve_newlines: 1 }));
      this.push(file);

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
