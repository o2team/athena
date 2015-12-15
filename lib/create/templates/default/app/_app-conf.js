'use strict';

module.exports = {
  app: '<%= conf.appName %>',
  appId: '<%= conf.appId %>',
  common: 'gb',
  moduleList: ['gb'],
  tmpName: 'default',
  deploy: {
    local: {
      fdPath: '/'
    },
    preview: {
      host: 'labs.qiang.it',
      user: '',
      pass: '',
      port: 21,
      fdPath: '/h5/',
      domain: 'labs.qiang.it',
      remotePath: '/labs.qiang.it/h5/<%= conf.appName %>'
    },
    jdTest: {
      host: '192.168.193.32',
      user: '',
      pass: '',
      port: 22,
      fdPath: '/fd/h5/',
      domain: 's.paipaiimg.com',
      remotePath: '/export/paipai/resource/static/fd/h5/<%= conf.appName %>',
      cssi: '/export/paipai/resource/sinclude/cssi/fd/h5/<%= conf.appName %>',
      assestPrefix: '/static/fd/h5/<%= conf.appName %>',
      shtmlPrefix: '/sinclude/cssi/fd/h5/<%= conf.appName %>'
    },
    tencent: {
      host: '172.25.34.21',
      user: '',
      pass: '',
      port: 21,
      fdPath: '/fd/h5/',
      domain: 'static.paipaiimg.com',
      remotePath: '/newforward/static/fd/h5/<%= conf.appName %>',
      cssi: '/newforward/static/sinclude/cssi/fd/h5/<%= conf.appName %>',
      assestPrefix: '/static/fd/h5/<%= conf.appName %>',
      shtmlPrefix: '/static/sinclude/cssi/fd/h5/<%= conf.appName %>'
    }
  }
};
