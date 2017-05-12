var Util = require('./index')
var stripComments = require('./strip_comments')

exports.trackJsDep = function trackJsDep (code) {
  var regexps = Util.regexps
  var requireReg = regexps.require
  var requireAsyncReg = regexps.requireAsync
  code = stripComments(code)
  var codeArr = code.split('\n')
  var requireDep = []
  var requireAsyncDep = []
  codeArr.forEach(function (line, index) {
    var requireMatch = match(requireReg, line, index)
    var requireAsyncMatch = match(requireAsyncReg, line, index)
    if (requireMatch) {
      requireDep.push(requireMatch)
    }
    if (requireAsyncMatch) {
      requireAsyncDep.push(requireAsyncMatch)
    }
  })
  if (!requireDep.length && !requireAsyncDep.length) {
    return false
  }
  return {
    sync: requireDep,
    async: requireAsyncDep
  }
}

exports.trackJsDepAndModify = function trackJsDepAndModify (code, cb) {
  var regexps = Util.regexps
  var requireReg = regexps.require
  var requireAsyncReg = regexps.requireAsync
  code = stripComments(code)
  var codeArr = code.split('\n')
  codeArr = codeArr.map(function (line, index) {
    var requireMatch = match(requireReg, line, index)
    var requireAsyncMatch = match(requireAsyncReg, line, index)
    if (requireMatch) {
      line = cb('sync', line, requireMatch)
    }
    if (requireAsyncMatch) {
      var variable = requireAsyncMatch['variable']
      requireAsyncMatch['variable'] = requireAsyncMatch['path']
      requireAsyncMatch['path'] = variable
      line = cb('lazy', line, requireAsyncMatch)
    }
    return line
  })
  return codeArr.join('\n')
}

function match (regexp, str, index) {
  var matchRes = regexp.exec(str)
  if (matchRes) {
    return {
      index: index,
      variable: matchRes[1] || '',
      path: matchRes[2],
      original: str
    }
  }
  return false
}