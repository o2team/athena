'use strict';

var gutil = require('gulp-util');

module.exports = function createError(pluginName, file, err) {
  if (typeof err === 'string') {
    return new gutil.PluginError(pluginName, file.path + ': ' + err, {
      fileName: file.path,
      showStack: false
    });
  }

  var msg = err.message || err.msg || 'unspecified error';

  return new gutil.PluginError(pluginName, file.path + ': ' + msg, {
    fileName: file.path,
    lineNumber: err.line,
    stack: err.stack,
    showStack: false
  });
};