'use strict';

module.exports = {
  app: '<%= conf.appName %>', // 项目英文名
  appId: '<%= conf.appId %>', // 项目ID
  description: '<%= conf.appDescription %>',
  common: 'gb', // 公共模块名称
  moduleList: ['gb'], // 拥有的模块列表
  tmpId: '<%= conf.tmpId %>', // 选用模板
  deploy: { //项目部署配置，可自己增加另外的需要进行ftp上传的机器
    local: { // 本地预览配置
      fdPath: '/'
    },
    preview: { // 目的预览机的配置，字段名固定
      host: 'labs.qiang.it',
      user: '',
      pass: '',
      port: 21,
      fdPath: '/h5/',
      domain: 'labs.qiang.it',
      remotePath: '/labs.qiang.it/h5/<%= conf.appName %>'
    },
    jdTest: { // 目的京东测试机器的配置，字段名固定
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
    tencent: { // 目的腾讯测试机器的配置，字段名固定
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
