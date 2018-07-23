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

function generateShtml ($, fileName, config, appConf, resType, dom, tag, uriType,opts) {
  var content = '';
  var failoverContent = ''
  var inlineStr = '';
  var hrefs = []
  var failoverDomain = config.failoverDomain
  if (config.needCombo) {
    var combofile = config.fdPath + config.app + '/' + config.module + '/' + fileName + '.shtml';
    var href = '\/\/' + config.domain + config.comboPrefix;
    var failoverHref
    if (failoverDomain) {
      failoverHref = '\/\/<!--#echo var=\'http_wq_failover_domain\' -->' + config.comboPrefix
    }
    var inlineDomLength = $(tag + '[inline]').length;
    var lenCount = dom.length - inlineDomLength;
    if (lenCount === 1) {
      href = '\/\/' + config.domain;
      if (failoverDomain) {
        failoverHref = '\/\/<!--#echo var=\'http_wq_failover_domain\' -->'
      }
    }
    dom.each(function (i, item) {
      var inline = item['attribs']['inline'];
      var uriText = item['attribs'][uriType];
      if (_.isUndefined(inline)) {
        if (uriText) {
          uriText = uriText.replace('\/\/' + config.domain, '');
          href += uriText;
          if (failoverHref) {
            uriText = path.dirname(uriText) + '/failover_' + path.basename(uriText)
            failoverHref += uriText
          }
          if (i === dom.length - 1) {
            href += '';
            if (failoverHref) {
              failoverHref += ''
            }
          } else {
            href += ',';
            if (failoverHref) {
              failoverHref += ','
            }
          }
        }
      } else {
        inlineStr += getInlineStr(config, appConf, uriText, resType);
      }
    });

    if (config.needTimestamp) {
      href += '?t=' + new Date().getTime();
      if (failoverHref) {
        failoverHref += '?t=' + new Date().getTime();
      }
    }
    var template = '';
    hrefs.push(href)
    if (tag === 'link') {
      template = '<link combofile="<%= combofile %>" rel="stylesheet" href="<%= href %>" onerror="__reloadResource(this)" />';
    } else {
      template = '<script combofile="<%= combofile %>" src="<%= href %>" onerror="__reloadResource(this)"></script>';
    }
    content += inlineStr;
    if (lenCount > 0) {
      content += _.template(template)({
        combofile: combofile,
        href: href
      });
      if (failoverHref) {
        failoverContent = _.template(template)({
          combofile: combofile,
          href: failoverHref
        })
      }
    }
  } else {
    var resList = '';
    var failoverResList = ''
    dom.each(function (i, item) {
      var inline = item['attribs']['inline'];
      var uriText = item['attribs'][uriType];
      if (_.isUndefined(inline)) {
        var failoverHref
        var failoverUriText
        if (failoverDomain) {
          failoverHref = '\/\/<!--#echo var=\'http_wq_failover_domain\' -->'
          failoverUriText = uriText.replace('\/\/' + config.domain, '')
          failoverUriText = failoverHref + failoverUriText
          failoverUriText = path.dirname(failoverUriText) + '/failover_' + path.basename(failoverUriText)
        }
        if (config.needTimestamp) {
          uriText += '?t=' + new Date().getTime();
          if (failoverUriText) {
            failoverUriText += '?t=' + new Date().getTime()
          }
        }
        hrefs.push(uriText)
        var template = '';
        if (tag === 'link') {
          template = '<link rel="stylesheet" href="<%= href %>" onerror="__reloadResource(this)" />';
        } else {
          template = '<script src="<%= href %>" onerror="__reloadResource(this)"></script>';
        }
        var resItem = _.template(template)({
          href: uriText
        });
        var failoverResItem
        if (failoverUriText) {
          failoverResItem = _.template(template)({
            href: failoverUriText
          });
        }

        resList += resItem;
        if (failoverResItem) {
          failoverResList += failoverResItem
        }
        if (i === dom.length - 1) {
          resList += '';
          if (failoverResList) {
            failoverResList += ''
          }
        } else {
          resList += '\n';
          if (failoverResList) {
            failoverResList += '\n'
          }
        }
      } else {
        inlineStr += getInlineStr(config, appConf, uriText, resType);
      }
    });
    content += inlineStr;
    content += resList;
    if (failoverResList) {
      failoverContent += failoverResList
    }
  }
  if(tag=="link"&&opts.mapJson&&opts.modulePath){
    let tpl = '<!-- #include virtual="' + Util.urlJoin(config.shtmlCommentPrefix, config.module, "allinone_"+fileName + '.shtml') + '" -->\n';
    tpl += '<link combofile="<%= combofile %>" rel="stylesheet" href="<%= href %>" onerror="__reloadResource(this)" />';
    let newName= "css/allinone_"+fileName+".css",rev = opts.mapJson[config.revName];
    if(rev&&rev.css&&rev.css[newName]){
      let file = _.template(tpl)({
        combofile: newName,
        href: '//' + config.domain+config.fdPath+appConf.app+"/"+config.module+"/"+rev.css[newName]
      });
      
      let p = path.join(opts.modulePath, 'dist', 'output', 'combofile');
      if(!fs.existsSync(p)){
        fs.mkdirSync(p);
      }
      fs.writeFile(path.join(p,'allinone_'+fileName+".shtml"), file,function(){});
    }
    
  }
  return {
    content: content,
    failoverContent, failoverContent,
    hrefs: hrefs
  }
}

function combo (opts) {
  var config = _.assign({
    app: null,
    module: null,
    cwd: null,
    fdPath: '',
    domain: '',
    revName:"rev",
    shtmlCommentPrefix: '',
    comboPrefix: '/c/=',
    needCombo: false,
    needTimestamp: false,
    needPreload: false
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
      var cssShtmlObj = generateShtml($, fileName, config, appConf, 'css', links, 'link', 'href',opts)
      var jsShtmlObj = generateShtml($, fileName, config, appConf, 'js', scripts, 'script', 'src')
      var canFailover = false
      if (config.needFailover) {
        if (config.failoverPages === true) {
          canFailover = true
        } else if (Array.isArray(config.failoverPages)) {
          config.failoverPages.forEach(function (item) {
            if (fileName.indexOf(item) >= 0) {
              canFailover = true
            }
          })
        }
      }
      if (canFailover) {
        if (cssShtmlObj.failoverContent) {
          cssFileContent += '<!--#if expr="$http_wq_failover_domain" -->\n'
          cssFileContent += cssShtmlObj.failoverContent
          cssFileContent += '\n<!--#else -->\n'
          cssFileContent += cssShtmlObj.content
          cssFileContent += '\n<!--#endif -->\n'
        } else {
          cssFileContent += cssShtmlObj.content
        }
        jsFileContent = jsShtmlObj.content
      } else {
        cssFileContent = cssShtmlObj.content
        jsFileContent = jsShtmlObj.content
      }
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
      if (config.needPreload && cssShtmlObj.hrefs.length) {
        var cssPreloadContent = '<script>JD.preload._css_detail_detail = '
        if (cssShtmlObj.hrefs.length === 1) {
          cssPreloadContent += '"' + cssShtmlObj.hrefs[0] + '"'
        } else {
          cssPreloadContent += JSON.stringify(cssShtmlObj.hrefs)
        }
        cssPreloadContent += ';</script>'
        var cssPreloadFile = new gutil.File({
          path: fileName + '_preload_css.shtml',
          contents: new Buffer(cssPreloadContent)
        })
        this.push(cssPreloadFile)
      }
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
