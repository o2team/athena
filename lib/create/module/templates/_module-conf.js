'use strict';

module.exports = {
  creator: '<%= conf.author %>',
  app: '<%= conf.appName %>',
  common: 'gb',
  module: '<%= conf.moduleName %>',
  description: '<%= conf.moduleDescription %>',
  deploy: '//labs.qiang.it/h5/<%= conf.appName %>/<%= conf.moduleName %>/',
  publish: '//<%= conf.secondaryDomain %>.paipaiimg.com/fd/h5/<%= conf.appName %>/<%= conf.moduleName %>/',
  support : {
    px2rem: {
      enable: false,
      root_value: 40,
      unit_precision: 5,
      prop_white_list: [],
      selector_black_list: [],
      replace: true,
      media_query: false
    },
  }
};
