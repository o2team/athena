'use strict'

var mkdirp = require('mkdirp');
var memFs = require('mem-fs');
var FileEditor = require('mem-fs-editor');
var path = require('path');
var fs = require('fs');
var Class = require('../class');
var pathIsAbsolute = require('path-is-absolute');
var pathExists = require('path-exists');
var request = require('request');
var unzip = require('unzip');
var Util = require('../util');
var config = Util.getSetting();
var crypto = require('crypto');


function readCache(path){
  var _cache = {
    version : 0,
    items : [{
      name : '默认模板',
      _id  : 'default',
      desc : '默认模板'
    }]
  };

  if(!fs.existsSync(path)){
    writeCache(_cache, path);
  }
  var _cache = fs.readFileSync(path,'utf8');
    _cache = JSON.parse(_cache);
  return _cache;
}

function writeCache(content, _path){
  fs.writeFileSync(_path, JSON.stringify(content), 'utf8');
}


// md5-file
function md5File(filename, callback) {
  var sum = crypto.createHash('md5')
  if (callback && typeof callback === 'function') {
    var fileStream = fs.createReadStream(filename)
    fileStream.on('error', function (err) {
      return callback(err, null)
    })
    fileStream.on('data', function (chunk) {
      try {
        sum.update(chunk)
      } catch (ex) {
        return callback(ex, null)
      }
    })
    fileStream.on('end', function () {
      return callback(null, sum.digest('hex'))
    })
  } else {
    sum.update(fs.readFileSync(filename))
    return sum.digest('hex')
  }
}


var Base = Class.extend({
  construct: function () {
    this.sharedFs = memFs.create();
    this.fs = FileEditor.create(this.sharedFs);

    this.sourceRoot(path.join(this.resolved, '../templates'));

    this.localSourceRoot = path.join(path.resolve(__dirname, '../../'),'/.tmp/');
    if(!fs.existsSync(this.localSourceRoot)){
      fs.mkdir(this.localSourceRoot)
    }
    
    
  },

  mkdir: function () {
    mkdirp.sync.apply(mkdirp, arguments);
  },

  // 资源根路径
  sourceRoot: function (rootPath) {
    if (typeof rootPath === 'string') {
      this._sourceRoot = path.resolve(rootPath);
    }

    return this._sourceRoot;
  },

  // 模板路径
  templatePath: function () {
    var filepath = path.join.apply(path, arguments);
    if (!pathIsAbsolute(filepath)) {
      filepath = path.join(this.localSourceRoot, 'templates' , filepath);
    }
    return filepath;
  },
  destinationRoot: function (rootPath) {
    if (typeof rootPath === 'string') {
      this._destinationRoot = path.resolve(rootPath);

      if (!pathExists.sync(rootPath)) {
        mkdirp.sync(rootPath);
      }

      process.chdir(rootPath);
    }
    return this._destinationRoot || process.cwd();
  },
  destinationPath: function () {
    var filepath = path.join.apply(path, arguments);

    if (!pathIsAbsolute(filepath)) {
      filepath = path.join(this.destinationRoot(), filepath);
    }

    return filepath;
  },

  // 渲染模板
  template: function (tmpname, type, source, dest, data, options) {
    if (typeof dest !== 'string') {
      options = data;
      data = dest;
      dest = source;
    }
    this.fs.copyTpl(
      this.templatePath(tmpname, type, source),
      this.destinationPath(dest),
      data || this,
      options
    );
    return this;
  },

  // 拷贝
  copy: function (tmpname, type, source, dest) {
    dest = dest || source;
    this.template(tmpname, type, source, dest);
    return this;
  },

  // 获取远程配置

  getRemoteConf: function (cbk) {
    var that = this;
    var cache = readCache(path.join(that.localSourceRoot, '_cache.json'));
    request.get(config.report_url + '/api/templates', function(err, res, body){
      // 获取到更新则同步
      if (!err && res.statusCode == 200) {
        var body = JSON.parse(body);
        var templatesVersion = body.data.version;
        if(templatesVersion == cache.version) {
          cbk(cache);
        }else {    

          // 下载新的模板
          var _tmppath = path.join(that.localSourceRoot,'/templates.zip');
          try {
            request(config.report_url + '/api/template/download')
            .pipe(fs.createWriteStream(_tmppath))
            .on('finish',function(){

              md5File(_tmppath, function(err, sum){
                if(err) {
                  cbk(cache);
                  console.log('警告：验证zip包出错,请检查异常！');

                }else if(sum == body.data.version) {
                  cache = body.data;
                  Util.rmfolder(path.join(that.localSourceRoot,'templates') , true);
                  fs.createReadStream(_tmppath)
                  .pipe(unzip.Extract({ path: path.join(that.localSourceRoot,'templates') }))
                  .on('finish', function(){
                    writeCache(cache , path.join(that.localSourceRoot, '_cache.json'))
                    cbk(cache);
                    fs.unlinkSync(_tmppath)
                  })
                }         

              });

            })

          }catch(e){
              cbk(cache);

          }

        }
      }else {
        console.log('警告：未能从服务端同步到最新的模板信息，请检查异常！')
        cbk(cache);
      }
    });
  }
});

module.exports = Base;
