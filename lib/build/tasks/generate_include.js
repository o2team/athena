/**
* @fileoverview 生成html页面片
* @author  liweitao
*/

'use strict';

module.exports = function($, appConf, moduleConf, args) {
  return function(mod, modulePath, appPath, remoteName) {
    return new Promise( function(resolve, reject) {
      var path = require('path');
      var fs = require('fs');
      var _ = require('lodash');
      var beautifyHtml = require('js-beautify').html;
      var mkdirp = require('mkdirp');
      var vfs = require('vinyl-fs');
      var es = require('event-stream');

      var Util = require('../../util');
      var athenaMate = require('../athena_mate');

      var useInclude = appConf.useInclude;
      var folder = useInclude ? useInclude.folder ? useInclude.folder : 'include' : 'include';
      var isPack = (args && args.pack) ? args.pack : false;
      var isServe = (args && args.isServe) ? args.isServe : false;
      var isCompress = (args && args.compress) ? args.compress : false;
      if (useInclude
        && !_.isEmpty(useInclude.files)
        && Util.existsSync(path.join(appPath, '.' + folder + '.json'))) {
          var streamArr = [];
          var fileChunk;
          try {
            fileChunk = JSON.parse(String(fs.readFileSync(path.join(appPath, '.' + folder + '.json'))));
          } catch (e) {
            fileChunk = {};
          }
          if (!_.isEmpty(fileChunk)) {
            for (var i in fileChunk) {
              var includeFolder = path.join(appPath, '.temp', appConf.app, folder);
              if (!Util.existsSync(includeFolder)) {
                mkdirp.sync(includeFolder);
              }
              var content = fileChunk[i].content;
              fs.writeFileSync(path.join(includeFolder, i), beautifyHtml(content, { indent_size: 2, max_preserve_newlines: 1 }));
              streamArr.push(vfs.src(path.join(includeFolder, i))
                .pipe(athenaMate.replace({
                  cwd: appPath,
                  module: fileChunk[i].module,
                  pack: isPack,
                  serve: isServe,
                  compress: isCompress
                }))
                .pipe(vfs.dest(includeFolder)));
            }
            es.merge(streamArr)
              .on('end', function () {
                resolve(remoteName);
              });
          } else {
            resolve(remoteName);
          }
      } else {
        resolve(remoteName);
      }
    });
  }
}
