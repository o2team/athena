'use strict';

module.exports = {
  app: '<%= conf.appName %>', // 项目英文名
  appId: '<%= conf.appId %>', // 项目ID
  description: '<%= conf.appDescription %>',
  platform: 'mobile', // 平台 pc or mobile
  common: 'gb', // 公共模块名称
  moduleList: ['gb'], // 拥有的模块列表
  tmpName: '<%= conf.tmpName %>', // 选用模板
  shtml: {  //页面片配置
    use: true, //是否使用
    needCombo: true // 页面片中链接是否合并
  },
  deploy: { //项目部署配置，可自己增加另外的需要进行ftp上传的机器
    local: { // 本地预览配置
      fdPath: '/'
    },
    preview: { // 目的预览机的配置，字段名固定
      mode: 'ftp',
      host: 'labs.qiang.it',
      user: '',
      pass: '',
      port: 21,
      fdPath: '/h5/',
      domain: 'labs.qiang.it',
      remotePath: '/usr/share/nginx/html/public/labs/h5/<%= conf.appName %>'
    },
    jdcfinder: { // jdcfinder
      mode: 'http',
      host: 'jdcfinder',
      user: '',
      pass: '',
      fdPath: '/fd/h5/',
      domain: 'jdc.jd.com',
      remotePath: '/fd/h5/<%= conf.appName %>', // 上传代码的目录
      cssi: '/sinclude/cssi/fd/h5/<%= conf.appName %>', // 上传页面片的目录
      assestPrefix: '/fd/h5/<%= conf.appName %>', // 发布完静态资源后，静态资源路径
      shtmlPrefix: '/sinclude/cssi/fd/h5/<%= conf.appName %>' // 发布完页面片后，静态资源路径
    },
    jdTest: { // 目的京东测试机器的配置，字段名固定
      mode: 'ftp',
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
    }
  }
};
