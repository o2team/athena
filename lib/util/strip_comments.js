var Util = require('./index')

module.exports = function (str) {
  return str.replace(Util.regexps.comment, '')
}