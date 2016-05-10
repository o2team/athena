/**
* @fileoverview CSSLint
* @author  liweitao
*/

'use strict';

var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');
var through2 = require('through2');
var csslint = require('csslint').CSSLint;
var _ = require('lodash');

var Util = require('../../util');

function getCsslintrc (rcPath) {
  if (!rcPath) {
    return {};
  }
  var rules = {};
  if (Util.existsSync(rcPath)) {
   try {
      rules = JSON.parse(String(fs.readFileSync(rcPath)));
    } catch (error) {
      rules = {};
    } 
  }
  
  return rules;
}

function printResult (fileName, result) {
  if(result && result.messages.length) {
    result.messages.forEach(function (message) {
      var type = message.type;
      if (type === 'error' || type === 'warning') {
        var tip = '[CSSLint] ' + fileName + ':' + type + ',';
        tip += ' line: ' + message.line + ', column: ' + message.col + ', ';
        tip += message.message;
        tip += '\n >>' + message.evidence;
        console.log(gutil.colors.white(tip));
      }
    });
  }
}

module.exports = function (opts) {
  opts = _.assign({
    cwd: '',
    module: '',
    csslintrc: null
  }, opts);
  var modulePath = path.join(opts.cwd, opts.module);
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
    var ignoreBlock = /(\/\*\s*csslint ignore\s*:\s*start)(.*\n)+?(\/\*\s*csslint ignore\s*:\s*end\s*\*\/)/igm;
    var lintResult = csslint.verify(content, ruleset);
    var fileName = file.path.replace(path.join(modulePath, 'dist', '_/'), '');
    printResult(fileName, lintResult);
    file.contents = new Buffer(content.replace(ignoreBlock, ''));
    this.push(file);
    callback();
  });

  return stream;
};
