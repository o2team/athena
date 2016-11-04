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

function getInlineStr (config, appConf, resId, type) {
  var inlineStr = '';
  var resPath = resId.replace('\/\/' + Util.urlJoin(config.domain, config.fdPath, config.app, '/'), '');
  var moduleName = resPath.split('/')[0];
  resPath = resPath.replace(moduleName, '');
  resPath = path.join(config.cwd, moduleName, 'dist', 'output', resPath);
  
  if (Util.existsSync(resPath)) {
    if (type === 'css') {
      inlineStr += '\n<style>';
      inlineStr += '/*filename=' + resId + '*/';
      inlineStr += String(fs.readFileSync(resPath));
      inlineStr += '</style>\n';
    } else if (type === 'js') {
      inlineStr += '\n<script>';
      inlineStr += '/*filename=' + resId + '*/';
      inlineStr += String(fs.readFileSync(resPath));
      inlineStr += '</script>\n';
    }
  } else {
    gutil.log(gutil.colors.red('生成页面片内联资源时，资源' + resPath + '没有找到！'));
  }
  return inlineStr;
}

function generateShtml ($, fileName, config, appConf, resType, dom, tag, uriType) {
  var content = '';
  var inlineStr = '';
  if (config.needCombo) {
    var combofile = config.fdPath + config.app + '/' + config.module + '/' + fileName + '.shtml';
    var href = '\/\/' + config.domain + config.comboPrefix;
    var inlineDomLength = $(tag + '[inline]').length;
    var lenCount = dom.length - inlineDomLength;
    if (lenCount === 1) {
      href = '\/\/' + config.domain;
    }
    dom.each(function (i, item) {
      var inline = item['attribs']['inline'];
      var uriText = item['attribs'][uriType];
      if (_.isUndefined(inline)) {
        if (uriText) {
          uriText = uriText.replace('\/\/' + config.domain, '');
          href += uriText;
          if (i === dom.length - 1) {
            href += '';
          } else {
            href += ',';
          }
        }
      } else {
        inlineStr += getInlineStr(config, appConf, uriText, resType);
      }
    });
    
    if (config.needTimestamp) {
      href += '?t=' + new Date().getTime();
    }
    var template = '';
    if (tag === 'link') {
      template = '<link combofile="<%= combofile %>" rel="stylesheet" href="<%= href %>" />';
    } else {
      template = '<script combofile="<%= combofile %>" src="<%= href %>"></script>';
    }
    content += inlineStr;
    if (lenCount > 0) {
      content += _.template(template)({
        combofile: combofile,
        href: href
      });
    }
  } else {
    var resList = '';
    dom.each(function (i, item) {
      var inline = item['attribs']['inline'];
      var uriText = item['attribs'][uriType];
      if (_.isUndefined(inline)) {
        if (config.needTimestamp) {
          uriText += '?t=' + new Date().getTime();
        }
        var template = '';
        if (tag === 'link') {
          template = '<link rel="stylesheet" href="<%= href %>" />';
        } else {
          template = '<script src="<%= href %>"></script>';
        }
        var resItem = _.template(template)({
          href: uriText
        });
        resList += resItem;
        if (i === dom.length - 1) {
          resList += '';
        } else {
          resList += '\n';
        }
      } else {
        inlineStr += getInlineStr(config, appConf, uriText, resType);
      }
    });
    content += inlineStr;
    content += resList;
  }
  return content;
}

function combo (opts) {
  var config = _.assign({
    app: null,
    module: null,
    cwd: null,
    fdPath: '',
    domain: '',
    shtmlCommentPrefix: '',
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
      var cssFileContent = '';
      var jsFileContent = '';
      var $ = cheerio.load(fileContent, { decodeEntities: false });

      $('html').each(function (i, item) {
        var nodeType = item.nodeType;
        if (nodeType === 8 && /global:|endglobal/.test(item.data)) {
          $(item).remove();
        }
      });
      var links = $('link[rel=stylesheet][combo-use]');
      var scripts = $('script[combo-use]');
      var appConf = require(path.join(config.cwd, 'app-conf'));
      cssFileContent = generateShtml($, fileName, config, appConf, 'css', links, 'link', 'href');
      jsFileContent = generateShtml($, fileName, config, appConf, 'js', scripts, 'script', 'src');
      links.remove();
      scripts.remove();
      file.contents = new Buffer(beautifyHtml($.html(), { indent_size: 2, max_preserve_newlines: 1 }));
      this.push(file);
      var cssCommentStr = '<!-- #include virtual="' + Util.urlJoin(config.shtmlCommentPrefix, config.module, fileName + '.shtml') + '" -->\n';
      var jsCommentStr = '<!-- #include virtual="' + Util.urlJoin(config.shtmlCommentPrefix, config.module, fileName + '_js.shtml') + '" -->\n';
      cssFileContent = cssCommentStr + cssFileContent;
      jsFileContent = jsCommentStr + jsFileContent;
      var cssShtmlFile = new gutil.File({
        path: fileName + '.shtml',
        contents: new Buffer(cssFileContent)
      });
      var jsShtmlFile = new gutil.File({
        path: fileName + '_js.shtml',
        contents: new Buffer(jsFileContent)
      });
      this.push(cssShtmlFile);
      this.push(jsShtmlFile);
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