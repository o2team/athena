/**
* @fileoverview CSSLint
* @author  liweitao@jd.com
*/

'use strict';

var fs = require('fs');
var gutil = require('gulp-util');
var through2 = require('through2');
var csslint = require('csslint').CSSLint;
var _ = require('lodash');

function getCsslintrc (rcPath) {
  if (!rcPath) {
    return {};
  }
  var rules = {};
  try {
    rules = JSON.parse(String(fs.readFileSync(rcPath)));
  } catch (error) {
    rules = {};
  }
  
  return rules;
}

function printResult (file, result) {
  if(result && result.messages.length) {
    gutil.log(gutil.colors.red('文件' + file.path + '中有' + result.messages.length + '个问题！'));    
    result.messages.forEach(function (message, index) {
      var type = message.type;
      if (type === 'error' || type === 'warning') {
        console.log('1 ' + type + ':');
        console.log('at line: ' + message.line + ', column: ' + message.col);
        console.log(message.message);
        console.log('  ' + message.evidence);
        console.log();
      }
    });
  }
}

module.exports = function (opts) {
  opts = _.assign({
    csslintrc: null
  }, opts);
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull() || file.isStream()) {
      return callback(null, file);
    }
    var ruleset = {};
    var customRules = getCsslintrc(opts.csslintrc);
    csslint.getRules().forEach(function(rule) {
      ruleset[rule.id] = 1;
    });
    for (var key in customRules) {
      if (!customRules[key]) {
        delete ruleset[key];
      }
    }
    var content = file.contents.toString(encoding);
    if (!content) {
      return callback(null, file);
    }
    var lintResult = csslint.verify(content, ruleset);
    printResult(file, lintResult);
    this.push(file);
    callback();
  });

  return stream;
};
