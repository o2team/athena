'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var path = require('path');
      var fs = require('fs');
      var archiver = require('archiver');
      var archive = archiver('zip', {});
      var request = require('request');

      var modZipName = mod + '.zip';
      var output = fs.createWriteStream(path.join(modulePath, modZipName));

      var Util = require('../../util');

      output.on('close', function () {
        $.util.log('需要统计的代码包压缩完毕，大小：' + new Number(archive.pointer() / (1024 * 1024)).toFixed(2) + 'M，准备上传..' );
        var params = {
          appId: appConf.appId,
          moduleId: moduleConf.moduleId,
          athena: fs.createReadStream(path.join(modulePath, modZipName))
        };
        var boundaryKey = Math.random().toString(16); // random string
        // 上报压缩包数据

        $.util.log('正在上传...');
        request.post({
          url: Util.getConfig().report_url + '/api/upload',
          headers: {
            'Content-Type': 'multipart/form-data; boundary="'+ boundaryKey +'"'
          },
          formData: params
        }, function (err, res, body) {
          if (err) {
            reject(err);
            return $.util.log($.util.colors.red('上传失败'), err);
          }
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              body = JSON.parse(body);
              if (body.no === 0) {
                $.util.log('上传成功！开始进行代码发布！');
                fs.unlinkSync(path.join(modulePath, modZipName));
                resolve();
              } else {
                $.util.log('上传失败！请重试');
                fs.unlinkSync(path.join(modulePath, modZipName));
                reject();
              }
            } catch (e) {
              $.util.log('上传失败！请重试');
              fs.unlinkSync(path.join(modulePath, modZipName));
              reject();
            }
          }
        });
      });

      archive.on('error', function(err){
        reject(err);
        throw err;
      });

      archive.pipe(output);
      archive.bulk([
        {
          expand: true,
          cwd: path.join(modulePath, 'dist'),
          src: ['**/*']
        }
      ]);
      archive.finalize();
    });
  }
}
