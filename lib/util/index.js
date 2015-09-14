'use strict'

var mkdirp = require('mkdirp');
var memFs = require('mem-fs');
var FileEditor = require('mem-fs-editor');
var path = require('path');
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');
var _ = require('lodash');

var Util = {
  homedir: function () {
    function homedir () {
      var env = process.env;
    	var home = env.HOME;
    	var user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

    	if (process.platform === 'win32') {
    		return env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH || home || null;
    	}

    	if (process.platform === 'darwin') {
    		return home || (user ? '/Users/' + user : null);
    	}

    	if (process.platform === 'linux') {
    		return home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : null));
    	}

    	return home || null;
    }
  	return typeof os.homedir === 'function' ? os.homedir : homedir;
  }(),

  makeString: function (object) {
    if (object == null) {
      return '';
    }
    return '' + object;
  },

  classify: function (str) {
    str = Util.makeString(str);
    return _.capitalize(_.camelCase(str.replace(/[\W_]/g, ' ')).replace(/\s/g, ''));
  },

  decapitalize: function (str) {
    str = Util.makeString(str);
    return str.charAt(0).toLowerCase() + str.slice(1);
  },

  checksum: function (buf) {
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('Expected a buffer');
    }
    return crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
  }

};

module.exports = Util;
