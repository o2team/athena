/**
* @fileoverview client模式专用，根据map.json和static-conf.js合并资源
* @author  liweitao
*/

'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var vinylFs = require('vinyl-fs');
var es = require('event-stream');
var gutil = require('gulp-util');

var Util = require('../../util');

var concatCore = require('./athena_concat_core');

var exludeResource = {
  js: [],
  css: []
};

function getWidgetPath (modulePath, widget, config) {
  return path.join(modulePath, config.dest, '_', 'widget', widget);
}

function resourcesConcat (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined,
    pageFiles: [],
    map: 'map.json',
    dest: 'dist',
    end: function () {}
  }, opts);
  
  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at concat!'));
    return;
  }
  var modulePath = path.join(config.cwd, config.module);
  var exludeResourcePath = path.join(modulePath, 'dist', '_exlude_resource.json');
  exludeResource = Util.readJsonFile(exludeResourcePath);
  var streamArr = [];
  concactStatic(modulePath, config, function () {
    fs.readFile(path.join(modulePath, config.map), function (err, data) {
      if (err) {
        gutil.log(gutil.colors.red(config.map + '文件读取错误！'));
        if (_.isFunction(config.end)) {
          config.end();
        }
        return;
      }
      if (config.pageFiles.length > 0) {
        config.pageFiles = config.pageFiles.map(function (item) {
          return path.basename(item);
        });
      }
      var fileContent = String(data);
      var conf = JSON.parse(fileContent).dependency;
      if (_.isEmpty(conf)) {
        if (_.isFunction(config.end)) {
          config.end();
        }
        return;
      }
      for (var key in conf) {
        if (config.pageFiles.length && config.pageFiles.indexOf(key) < 0) {
          continue;
        }
        if (conf.hasOwnProperty(key)) {
          var page = key.split('.')[0];
          var pageConf = conf[key];
          var cssFiles = [];
          var jsFiles = [];
          var pagePath = path.join(modulePath, config.dest, '_', 'page', page);
          var appConf = require(path.join(config.cwd, 'app-conf'));
          pageConf.forEach(function (widgetItem) {
            if (widgetItem.module === appConf.common) {
              var mp = path.join(config.cwd, widgetItem.module);
              var widgetPath = getWidgetPath(mp, widgetItem.widgetName, config);
              cssFiles.push(path.join(widgetPath, '**', '*.css'));
              jsFiles.push(path.join(widgetPath, '**', '*.js'));
            }
          });
          pageConf.forEach(function (widgetItem) {
            if (widgetItem.module !== appConf.common) {
              var mp = path.join(config.cwd, widgetItem.module);
              var widgetPath = getWidgetPath(mp, widgetItem.widgetName, config);
              cssFiles.push(path.join(widgetPath, '**', '*.css'));
              jsFiles.push(path.join(widgetPath, '**', '*.js'));
            }
          });
          cssFiles.push(path.join(pagePath, '**', '*.css'));
          cssFiles = cssFiles.concat(exludeResource.css.map(function (item) {
            return path.join('!' + config.cwd, item.module, config.dest, '_', item.file);
          }));
          jsFiles.push(path.join(pagePath, '**', '*.js'));
          jsFiles = jsFiles.concat(exludeResource.js.map(function (item) {
            return path.join('!' + config.cwd, item.module, config.dest, '_', item.file);
          }));
          streamArr.push(es.merge(
            vinylFs
              .src(cssFiles)
              .pipe(concatCore(page + '.css'))
              .pipe(vinylFs.dest(path.join(modulePath, config.dest, '_static', 'css'))),
            vinylFs
              .src(jsFiles)
              .pipe(concatCore(page + '.js'))
              .pipe(vinylFs.dest(path.join(modulePath, config.dest, '_static', 'js')))
          ));
        }
      }
      es.merge(streamArr).on('end', function () {
        if (_.isFunction(opts.end)) {
          opts.end();
        }
      });
    });
  });
}

// 通过读取static-conf配置来进行资源合并
function concactStatic (modulePath, config, cb) {
  var streamArr = [];
  var staticPath = require(path.join(modulePath, 'static-conf')).staticPath;
  streamArr.push(vinylFs
    .src([path.join(modulePath, config.dest, '_', 'static', 'css', '**', '*.css'), path.join(modulePath, config.dest, '_', 'static', 'sass', '**', '*.css')])
    .pipe(vinylFs.dest(path.join(modulePath, config.dest, '_static', 'css')))
  );
  streamArr.push(vinylFs
    .src(path.join(modulePath, config.dest, '_', 'static', 'js', '**', '*.js'))
    .pipe(vinylFs.dest(path.join(modulePath, config.dest, '_static', 'js')))
  );
  es.merge(streamArr).on('end', function () {
    var streamArr = [];
    if (_.isEmpty(staticPath)) {
      cb();
      return;
    }
    for (var key in staticPath) {
      // css
      if (path.extname(key).indexOf('css') >= 0) {
        streamArr.push(vinylFs
          .src(staticPath[key].map(function (item) {
            return path.join(modulePath, config.dest, '_', item);
          }))
          .pipe(concatCore(key))
          .pipe(vinylFs.dest(path.join(modulePath, config.dest, '_static', 'css'))));
      }

      // js
      if (path.extname(key).indexOf('js') >= 0) {
        streamArr.push(vinylFs
          .src(staticPath[key].map(function (item) {
            return path.join(modulePath, config.dest, '_', item);
          }))
          .pipe(concatCore(key))
          .pipe(vinylFs.dest(path.join(modulePath, config.dest, '_static', 'js'))));
      }
    }
    es.merge(streamArr).on('end', function () {
      cb();
    });
  });
}

module.exports = resourcesConcat;
