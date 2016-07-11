/**
* @fileoverview server模式专用，主要合并static-conf.js中配置的资源
* @author  liweitao
*/

'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var vinylFs = require('vinyl-fs');
var es = require('event-stream');
var gutil = require('gulp-util');

var concatCore = require('./athena_concat_core');

function resourcesConcat (opts) {
  var config = _.assign({
    cwd: undefined,
    module: undefined,
    dest: 'dist',
    end: function () {}
  }, opts);

  if (!config.cwd || !config.module) {
    gutil.log(gutil.colors.red('传入参数有误 at concat!'));
    return;
  }

  var modulePath = path.join(config.cwd, config.module);
  concactStatic(modulePath, config, function () {
    if (_.isFunction(opts.end)) {
      opts.end();
    }
  });
}

// 通过读取static-conf配置来进行资源合并
function concactStatic (modulePath, config, cb) {
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
        .src(staticPath[key].map(function (item) {
          return path.join(modulePath, config.dest, '_', item);
        }))
        .pipe(concatCore(key))
        .pipe(vinylFs.dest(path.join(modulePath, config.dest, '_static', 'static', 'css'))));
    }

    // js
    if (path.extname(key).indexOf('js') >= 0) {
      streamArr.push(vinylFs
        .src(staticPath[key].map(function (item) {
          return path.join(modulePath, config.dest, '_', item);
        }))
        .pipe(concatCore(key))
        .pipe(vinylFs.dest(path.join(modulePath, config.dest, '_static', 'static', 'js'))));
    }
  }
  es.merge(streamArr).on('end', function () {
    cb();
  });
}

module.exports = resourcesConcat;
