/**
* @fileoverview 生成CSS页面片
* @author  liweitao
*/

'use strict';

var through2 = require('through2');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');
var cheerio = require('cheerio');

var Util = require('../../util');

function getInlineStr (config, appConf, hrefText) {
  var inlineStr = '';
  var resPath = hrefText.replace('\/\/' + Util.urlJoin(config.domain, config.fdPath, config.app, '/'), '');
  var moduleName = resPath.split('/')[0];
  resPath = resPath.replace(moduleName, '');
  resPath = path.join(config.cwd, moduleName, 'dist', 'output', resPath);
  
  if (Util.existsSync(resPath)) {
    inlineStr += '\n<style>';
    inlineStr += '/*filename=' + hrefText + '*/';
    inlineStr += String(fs.readFileSync(resPath));
    inlineStr += '</style>\n';
  } else {
    gutil.log(gutil.colors.red('生成页面片内联资源时，资源' + resPath + '没有找到！'));
  }
  return inlineStr;
}

function combo (opts) {
  var config = _.assign({
    app: null,
    module: null,
    cwd: null,
    fdPath: '',
    domain: '',
    shtmlPrefix: '',
    comboPrefix: '/c/=',
    needCombo: false,
    needTimestamp: false
  }, opts);

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
      var links = $('link[rel=stylesheet][combo-use]');
      var appConf = require(path.join(config.cwd, 'app-conf'));
      var inlineStr = '';
      if (config.needCombo) {
        var combofile = config.fdPath + config.app + '/' + config.module + '/' + fileName + '.shtml';
        var href = '\/\/' + config.domain + config.comboPrefix;
        var inlineLinksLength = $('link[rel=stylesheet][inline]').length;
        if (links.length - inlineLinksLength <= 1) {
          href = '\/\/' + config.domain;
        }
        links.each(function (i, item) {
          var inline = item['attribs']['inline'];
          var hrefText = item['attribs']['href'];
          if (_.isUndefined(inline)) {
            if (hrefText) {
              hrefText = hrefText.replace('\/\/' + config.domain, '');
              href += hrefText;
              if (i === links.length - 1) {
                href += '';
              } else {
                href += ',';
              }
            }
          } else {
            inlineStr += getInlineStr(config, appConf, hrefText);
          }
        });
        if (config.needTimestamp) {
          href += '?t=' + new Date().getTime();
        }
        newFileContent += inlineStr;
        newFileContent += _.template('<link combofile="<%= combofile %>" rel="stylesheet" href="<%= href %>" />')({
          combofile: combofile,
          href: href
        });
      } else {
        var link = '';
        links.each(function (i, item) {
          var inline = item['attribs']['inline'];
          var hrefText = item['attribs']['href'];
          if (_.isUndefined(inline)) {
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
          } else {
            inlineStr += getInlineStr(config, appConf, hrefText);
          }
        });
        newFileContent += inlineStr;
        newFileContent += link;
      }
      
      links.remove();
      file.contents = new Buffer(beautifyHtml($.html(), { indent_size: 2, max_preserve_newlines: 1 }));
      this.push(file);
      var commentStr = '<!-- #include virtual="' + Util.urlJoin(config.shtmlPrefix, config.module, fileName + '.shtml') + '" -->\n';
      newFileContent = commentStr + newFileContent;
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