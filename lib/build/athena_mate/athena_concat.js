'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var concat = require('gulp-concat');
var vinylFs = require('vinyl-fs');
var es = require('event-stream');
var gutil = require('gulp-util');

var config = {};

function getWidgetPath (modulePath, widget) {
  return path.join(modulePath, 'widget', widget);
}

function resourcesConcat (opts) {
  config = _.assign({
    cwd: undefined,
    module: undefined,
    map: 'map.json',
    dest: 'output',
    end: function () {}
  }, opts);

  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at concat!'));
    return;
  }

  var streamArr = [];
  var modulePath = config.cwd + '/' + config.module;
  concactStatic(modulePath, function () {
    fs.readFile(path.join(modulePath, config.dest, config.map), function (err, data) {
      if (err) {
        gutil.log(gutil.colors.red(config.map + '文件读取错误！'));
        if (_.isFunction(config.end)) {
          config.end();
        }
        return;
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
        if (conf.hasOwnProperty(key)) {
          var page = key.split('.')[0];
          var pageConf = conf[key];
          var cssFiles = [];
          var jsFiles = [];
          var pagePath = path.join(modulePath, 'page', page);

          cssFiles.push(path.join(pagePath, '/*.css'));
          jsFiles.push(path.join(pagePath, '/*.js'));
          pageConf.forEach(function (widgetItem) {
            var mp = config.cwd + '/' + widgetItem.module;
            var widgetPath = getWidgetPath(mp, widgetItem.widgetName);
            // combo本模块的资源
            if (widgetItem.module === config.module) {
              cssFiles.push(path.join(widgetPath, '/*.css'));
              jsFiles.push(path.join(widgetPath, '/*.js'));
            }
          });
          streamArr.push(es.merge(
            vinylFs
              .src(cssFiles)
              .pipe(concat(page + '.css'))
              .pipe(vinylFs.dest(path.join(modulePath, opts.dest, 'css'))),
            vinylFs
              .src(jsFiles)
              .pipe(concat(page + '.js'))
              .pipe(vinylFs.dest(path.join(modulePath, opts.dest, 'js')))
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
function concactStatic (modulePath, cb) {
  var streamArr = [];
  var staticPath = require(path.join(modulePath, 'static-conf')).staticPath;
  if (_.isEmpty(staticPath)) {
    cb();
    return;
  }
  for (var key in staticPath) {
    // css
    if (path.extname(key).indexOf('css') >= 0) {
      streamArr.push(vinylFs
        .src(staticPath[key])
        .pipe(concat(key))
        .pipe(vinylFs.dest(path.join(modulePath, config.dest, 'css'))));
    }

    // js
    if (path.extname(key).indexOf('js') >= 0) {
      streamArr.push(vinylFs
        .src(staticPath[key])
        .pipe(concat(key))
        .pipe(vinylFs.dest(path.join(modulePath, config.dest, 'js'))));
    }
  }
  es.merge(streamArr).on('end', function () {
    cb();
  });
}

module.exports = resourcesConcat;
