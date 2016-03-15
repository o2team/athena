'use strict';

var scan = require('./athena_scan');
var scanServer = require('./athena_scan_server');
var concat = require('./athena_concat');
var concatServer = require('./athena_concat_server');
var concatCore = require('./athena_concat_core');
var combo = require('./athena_combo');
var replace = require('./athena_replace');
var replaceServer = require('./athena_replace_server');
var rev = require('./athena_rev');
var revServer = require('./athena_rev_server');
var imagemin = require('./athena_imagemin');
var csso = require('./athena_csso');
var uglify = require('./athena_uglify');
var ssh = require('./athena_ssh');
var inject = require('./athena_inject');
var injectServer = require('./athena_inject_server');
var pre = require('./athena_pre');
var compass = require('./athena_compass');
var ftp = require('./athena_ftp');
var aif = require('./athena_if');
var jdcFinder = require('./athena_jdcfinder');
var publishFilter = require('./athena_publish_filter');
var plumber = require('./athena_plumber');
var buildFilter = require('./athena_build_filter');

module.exports = {
  scan: scan,
  scanServer: scanServer,
  concat: concat,
  concatServer: concatServer,
  concatCore: concatCore,
  combo: combo,
  replace: replace,
  replaceServer: replaceServer,
  rev: rev,
  revServer: revServer,
  imagemin: imagemin,
  csso: csso,
  uglify: uglify,
  ssh: ssh,
  inject: inject,
  injectServer: injectServer,
  compass : compass,
  pre: pre,
  ftp: ftp,
  if: aif,
  jdcFinder: jdcFinder,
  publishFilter: publishFilter,
  plumber: plumber,
  buildFilter: buildFilter
};
