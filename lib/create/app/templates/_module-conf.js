'use strict';

module.exports = {
  creator: '<%= conf.author %>',
  app: '<%= conf.appName %>',
  common: 'gb',
  module: 'gb',
  moduleId: '<%= conf.commonModuleId %>',
  description: '公共模块',
  support : {
    csslint: {
      enable: true
    },
    jslint: {
      enable: true
    },
    px2rem: {
      enable: false,
      root_value: 40,
      unit_precision: 5,
      prop_white_list: [],
      selector_black_list: [],
      replace: true,
      media_query: false
    },
    fontcompress : {
      enable: false
    },
    csssprite: {
      enable: true,
      retina: false,
      rootvalue: 0
    }
  }
};
