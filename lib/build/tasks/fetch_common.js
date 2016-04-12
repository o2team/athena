/**
* @fileoverview 获取公共模块map.json文件
* @author  liweitao@jd.com
*/

'use strict';

// 获取管理平台上存储的公共模块的map.json并保存到本地
module.exports = function($, appConf, moduleConf, args) {
  return function(mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var fs = require('fs');
      var request = require('request');
      var mkdirp = require('mkdirp');
      var _ = require('lodash');

      var Util = require('../../util');
      var reportUrl = Util.getSetting().report_url;
      var getCommonVersionUrl = reportUrl + '/api/gb/version';
      var getCommonJsonUrl = reportUrl + '/api/gb';

      var isDebug = args.debug ? true : false;
      var cacheFolder = path.join(Util.getAthenaPath(), 'cache');
      var commonCacheFolder = path.join(cacheFolder, 'common');
      var commonVersionJsonFile = path.join(commonCacheFolder, 'common.json');
      var app = appConf.app;
      var appId = appConf.appId;
      var mod = moduleConf.module;
      var commonModule = appConf.common;

      if (!Util.existsSync(commonCacheFolder)) {
        mkdirp.sync(commonCacheFolder);
      }

      function getCommonJson (cb) {
        request.get(getCommonJsonUrl, {
          qs: {
            app: appId
          }
        }, function (err, res, body) {
          if (err) {
            if (isDebug) {
              console.log(err);
            }
            cb(false);
            return;
          }
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              body = JSON.parse(body);
              if (body.no === 0) {
                var data = body.data;
                if (_.isEmpty(body.data)) {
                  cb(false);
                  return;
                }
                fs.writeFileSync(path.join(commonCacheFolder, app + '_' + commonModule + '.json'), JSON.stringify(data, null, 2));
                cb(true);
              } else {
                if (isDebug) {
                  console.log(body);
                }
                cb(false);
              }
            } catch (e) {
              if (isDebug) {
                console.log(e);
              }
              cb(false);
            }
          } else {
            if (isDebug) {
              console.log(res.statusCode);
              console.log(res);
            }
            cb(false);
          }
        });
      }

      function getCommonVersion (cb) {
        request.get(getCommonVersionUrl, {
          qs: {
            app: appId
          }
        }, function (err, res, body) {
          if (err) {
            if (isDebug) {
              console.log(err);
            }
            cb(false);
            return;
          }
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              body = JSON.parse(body);
              if (body.no === 0) {
                var version = body.data.v;
                if (version === null) { // 未提交过common
                  cb('first');
                  return;
                }
                var commonVersionJson = {};
                if (Util.existsSync(commonVersionJsonFile)) {
                  try {
                    commonVersionJson = JSON.parse(fs.readFileSync(commonVersionJsonFile).toString());
                  } catch (e) {
                    commonVersionJson = {};
                  }
                }
                // 若没有保存版本的md5或者md5和服务端不一致，则重新请求一下新的map.json
                if (commonVersionJson[app + '_' + commonModule] === undefined
                  || commonVersionJson[app + '_' + commonModule] !== version
                  || !Util.existsSync(path.join(commonCacheFolder, app + '_' + commonModule + '.json'))) {
                  getCommonJson(function (success) {
                    if (success) {
                      commonVersionJson[app + '_' + commonModule] = version;
                      fs.writeFileSync(commonVersionJsonFile, JSON.stringify(commonVersionJson, null, 2));
                    } else {
                      $.util.log($.util.colors.red('请求' + commonModule + '的map.json出错，请反馈给liweitao'));
                    }
                    cb(true);
                  });
                } else {
                  cb(true);
                }
              } else {
                if (isDebug) {
                  console.log(body);
                }
                cb(false);
              }
            } catch (e) {
              if (isDebug) {
                console.log(e);
              }
              cb(false);
            }
          } else {
            if (isDebug) {
              console.log(res.statusCode);
              console.log(res);
            }
            cb(false);
          }
        });
      }
      // 首先请求一下服务器端版本号
      getCommonVersion(function (success) {
        if (!success) {
          $.util.log($.util.colors.red('请求' + commonModule + '的版本号出错，请反馈给liweitao'));
        }
        resolve();
      });
    });
  }
}
