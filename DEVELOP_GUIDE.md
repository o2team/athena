
# Athena开发指引

## 如何加入

代码开源于**Github**，地址：[https://github.com/o2team/athena](https://github.com/o2team/athena)，目前存在三个分支，``master`` 是主干，也是开发中的分支，``production`` 是用来发布到``npm``的分支， ``gh-pages``是Athena的主页。

为了保证代码质量，原则上不允许直接提交入``master`` 分支，若需要提交代码，请先Fork本Repo，在本地开发调试无误后提交Pull request，审核没有问题后再合并入主干。

本地开发调试，使用 ``npm link`` 命令。首先``git clone``自己的Fork项目

```
$ git clone git@github.com:luckyadam/athena.git
```

然后再执行 ``npm link`` 命令进行软链，让系统使用本地的Athena

```
$ cd athena
$ npm link
```

这样就可以进行本地的开发调试了。

确认无误后，再提交到远程仓库，在**Github**上发起Pull Request。

## 项目剖析

### 程序主入口

主入口文件位于 ``/bin/athena``，里面包含上面总结到的各种命令的实现方式，在定义命令上使用了第三方包[commander](https://www.npmjs.com/package/commander)。

举个栗子。

创建项目命令 ``ath app``，在``/bin/athena``文件中可以找到如下对应代码

```javascript
// Command: athena app [appName]
program
  .command('app [appName]')
  .alias('a')
  .description('创建新的项目')
  .option('--name [appName]', '项目名称')
  .option('--description [appDescription]', '项目描述')
  .option('--sass', '启用sass')
  .option('--less', '启用less')
  .option('--template [templateName]', '设置模板')
  .action(function(appName, option) {
    var app = new App({
      appName: appName || option.name,
      description: option.description,
      sass: option.sass,
      less: option.less,
      tmpId: option.template
    });
    // 创建完项目后进行数据上报
    app.create(function () {
      var argv = [].slice.call(arguments);
      report('app', addReportPath, argv, function (params) {
        var appConfPath = app.destinationPath(argv[0], 'app-conf.js');
        var commonModuleConfPath = app.destinationPath(argv[0], 'gb', 'module-conf.js');
        var commonModuleConf = require(commonModuleConfPath);
        params.appName = argv[0];
        params.appId = require(appConfPath).appId;
        params.commonModuleId = commonModuleConf.moduleId;
        params.commonModuleName = commonModuleConf.module;
      }, function (body) {
        if (body && body.no === 0) {
          console.log('success');
        }
      });
    });

  }).on('--help', function() {
    console.log('  Examples:');
    console.log('');
    console.log('    $ athena app cx');
    console.log('    $ athena a cx');
    console.log();
  });

```

上述代码负责创建项目并且进行数据上报，可以看到创建项目主要调用了``App``类的``create(callback)``方法，在文件的上方指明了了``App``类的来源

```javascript
var App = require('../lib/create/task/app');
```

若要了解``App``内部的实现逻辑，就要去看``/lib/create/task/app.js``的代码了。

其他命令采用类似的实现方式。

### 程序目录结构

```
├─ CHANGELOG.md                                           - 更新日志
├─ LICENSE                                                - 使用协议，MIT
├─ README.md                                              - 说明文档
├─ athena.txt                                             - Athena LOGO
├─ bin
│   └─ athena                                             - Athena命令执行入口文件
├─ index.js                                                - 包入口
├─ lib                                                     - 主要逻辑功能
│   ├─ build                                              - 编译相关的逻辑
│   │   ├─ athena_mate									- 编译中用到的插件，gulp插件写法
│   │   │   ├─ athena_build_filter.js					- 编译时的文件过滤，比如sass编译和图片压缩
│   │   │   ├─ athena_combo.js							- 负责生成CSS页面片
│   │   │   ├─ athena_compass.js							- 负责调用compass编译sass文件
│   │   │   ├─ athena_concat.js							- 根据map.json以及static-conf.js进行静态资源代码合并，用于client编译模式
│   │   │   ├─ athena_concat_core.js						- 代码合并功能
│   │   │   ├─ athena_concat_server.js					- 只和并static-conf.js里配置的静态资源，用于server编译模式
│   │   │   ├─ athena_csso.js							- 使用csso压缩CSS代码
│   │   │   ├─ athena_ftp.js								- ftp上传
│   │   │   ├─ athena_if.js								- gulp-if
│   │   │   ├─ athena_imagemin.js						- 图片压缩，只压缩了png格式
│   │   │   ├─ athena_inject.js							- 解析页面语法，生成完整html文件，client模式使用
│   │   │   ├─ athena_inject_server.js					- 解析页面语法，生成完整html文件，server模式使用
│   │   │   ├─ athena_jdcfinder.js						- 向jdcfinder机器发布代码
│   │   │   ├─ athena_plumber.js							- 提示任务流出错
│   │   │   ├─ athena_publish_filter.js					- 发布时缓存记录，用于过滤已发布文件，client模式
│   │   │   ├─ athena_publish_filter_server.js			- 发布时缓存记录，用于过滤已发布文件，server模式
│   │   │   ├─ athena_replace.js							- 地址替换，client模式
│   │   │   ├─ athena_replace_server.js					- 地址替换，server模式
│   │   │   ├─ athena_rev.js								- 文件加md5戳，client模式
│   │   │   ├─ athena_rev_server.js						- 文件加md5戳，server模式
│   │   │   ├─ athena_scan.js							- 代码扫描生成map.json，同时解析widget.load，client模式
│   │   │   ├─ athena_scan_server.js						- 代码扫描生成map.json，同时解析widget.load，client模式
│   │   │   ├─ athena_ssh.js								- 使用ssh2，包括向sftp服务器发布代码
│   │   │   ├─ athena_uglify.js							- 使用uglify压缩js代码
│   │   │   └─ index.js									- 入口文件，暴露方法
│   │   ├─ font_compress									- 字体压缩相关
│   │   │   ├─ compress
│   │   │   │   ├─ index.js
│   │   │   │   └─ utils.js
│   │   │   ├─ compress.js
│   │   │   ├─ index.js
│   │   │   ├─ spider
│   │   │   │   ├─ css-parser.js
│   │   │   │   ├─ html-parser.js
│   │   │   │   ├─ index.js
│   │   │   │   ├─ promise.js
│   │   │   │   ├─ resource.js
│   │   │   │   └─ utils.js
│   │   │   └─ spider.js
│   │   ├─ index.js										- 编译的主入口文件，组织编译任务，实现编译、预览、发布、拷贝组件的逻辑，供外界调用
│   │   └─ tasks											- 所有编译任务
│   │       ├─ all.js										- 拷贝指定代码目录代码到dist/_目录下
│   │       ├─ athena_mate.js								- 负责扫描代码，以及代码合并，解析widget.load工作，client模式
│   │       ├─ athena_mate_server.js						- 负责扫描代码，以及代码合并，解析widget.load工作，server模式
│   │       ├─ clone.js									- 拷贝组件
│   │       ├─ compress.js								- 代码压缩，client模式
│   │       ├─ compress_server.js							- 代码压缩，server模式
│   │       ├─ copy_file.js								- 拷贝文件
│   │       ├─ csslint.js									- csslint
│   │       ├─ fetch_common.js							- 获取公共模块的md5信息
│   │       ├─ fonts.js									- 字体压缩任务
│   │       ├─ generate_include.js						- 生成html页面片
│   │       ├─ images.js									- 图片压缩
│   │       ├─ inject.js									- 解析生成完整的html文件，client模式
│   │       ├─ inject_server.js							- 解析生成完整的html文件，server模式
│   │       ├─ jshint.js									- jshint
│   │       ├─ less.js									- 编译less
│   │       ├─ publish.js									- 发布任务，client模式
│   │       ├─ publish_server.js							- 发布任务，server模式
│   │       ├─ rev.js										- 文件加md5，client模式
│   │       ├─ rev_server.js								- 文件加md5，server模式
│   │       ├─ sass.js									- 编译sass
│   │       ├─ scripts.js									- 脚本文件处理
│   │       ├─ serve_css.js								- 预览时，css文件改动时要做的操作，client模式
│   │       ├─ serve_css_server.js						- 预览时，css文件改动时要做的操作，server模式
│   │       ├─ serve_js.js								- 预览时，js文件改动时要做的操作，client模式
│   │       ├─ serve_js_server.js							- 预览时，js文件改动时要做的操作，server模式
│   │       ├─ serve_page.js								- 预览时，模板文件改动时要做的操作，client模式
│   │       ├─ serve_page_server.js						- 预览时，模板文件改动时要做的操作，server模式
│   │       ├─ serve_trans.js								- 预览时，拷贝一些文件
│   │       ├─ serve_trans_images.js						- 预览时，拷贝图片文件
│   │       ├─ styles.js									- 样式处理，包括autoprefix，client模式
│   │       ├─ styles_server.js							- 样式处理，包括autoprefix，server模式
│   │       ├─ temp.js									- 负责生成站点地图，地址替换，将文件拷入.temp目录以供预览，client模式
│   │       ├─ temp_server.js								- 负责生成站点地图，地址替换，将文件拷入.temp目录以供预览，server模式
│   │       ├─ trans_output.js
│   │       ├─ trans_static.js
│   │       └─ upload.js									- 负责上传统计代码包
│   ├─ class.js											- Class类，简单实现规范化Class
│   ├─ create												- 创建项目、模块、页面、组件逻辑
│   │   ├─ base.js										- 基类
│   │   ├─ task											- 创建任务
│   │   │   ├─ app.js									- 创建项目，继承自base
│   │   │   ├─ module.js									- 创建模块，继承自base
│   │   │   ├─ page.js									- 创建页面，继承自base
│   │   │   └─ widget.js									- 创建组件，继承自base
│   │   └─ templates										- 最基础模板，网络请求在线模板失败时使用
│   │       └─ default
│   │           ├─ app
│   │           │   ├─ _app-conf.js
│   │           │   ├─ _common.scss
│   │           │   ├─ _gb.css
│   │           │   ├─ _gb.html
│   │           │   ├─ _gb.js
│   │           │   ├─ _module-conf.js
│   │           │   ├─ _static-conf.js
│   │           │   └─ editorconfig
│   │           ├─ module
│   │           │   ├─ _module-conf.js
│   │           │   └─ _static-conf.js
│   │           ├─ page
│   │           │   ├─ page.css
│   │           │   ├─ page.html
│   │           │   ├─ page.js
│   │           │   └─ page.json
│   │           └── widget
│   │               ├─ widget.css
│   │               ├─ widget.html
│   │               ├─ widget.js
│   │               └─ widget.json
│   └── util												- 辅助性方法
│       ├─ git_status.js									- 检查git状态
│       ├─ index.js										- 各种辅助方法
│       ├─ rmfolder.js									- 删除文件
│       └─ wrench.js
└─ package.json											- 报信息
```

可以看出，主要逻辑代码在`lib`目录下，`lib`中的`build`目录是所有编译相关的逻辑，`create`是创建项目等的逻辑，`util`中是一些帮助性方法。

### 编译逻辑

#### 编译概述

`build`目录中是所有的编译相关逻辑，其中`task`目录下是所有的编译任务，`athena_mate`目录中是编译任务中使用到的插件，由于Athena核心采用的是**Gulp**的`vinyl-fs`包来实现文件的流式处理方式，所以插件的写法基本都是**Gulp**插件的写法，具体可以参见[编写gulp插件](http://www.gulpjs.com.cn/docs/writing-a-plugin/)

```javascript
// 使用through2包处理文件流
var through2 = require('through2');

module.exports = function (options) {
  return through2.obj(function (file, encoding, cb) {
    // TODO：处理单个文件
    if (file.isNull()) {
    } else if (file.isStream()) {
    } else {
      this.push(file);
      cb();
    }
  }, function (cb) {
    // TODO：处理完所有文件后的回调

    // 若要面的任务必须执行，必须调用cb
    cb();
  });
};
```

在`tasks`的任务中会调用`athena_mate`中写好的插件，而为了做好任务流程控制，使用了`ES6 Promise`，任务写法都是返回一个返回值是返回`Promise`对象的函数，例如最简单的拷贝文件的任务

```javascript
'use strict';
// $是gulp-plugins，传入了项目配置，模块配置，自定义参数
module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      return vfs.src(args.src)
        .pipe(vfs.dest(args.dest))
        .on('finish', function() {
          resolve();
        }).on('err', function (err) {
          reject(err);
        });
    });
  }
};
```

所有任务都在`build`的入口文件`index.js`中被调用，来实现具体的功能，`index.js`是所有编译任务的主控制逻辑，通过看它暴露的4个方法，就能知道它具体干的事了

```javascript
// index.js暴露4个方法
module.exports = {
  build: build, // 编译，ath build会调用
  serve: serve, // 预览，ath serve会调用
  publish: publish, // 发布，ath publish会调用
  clone: clone // 复制组件，ath clone会调用
};
```

我们来看看编译流程是如何控制的，在`index.js`中有一个`buildSingleModule`方法，它实现的是编译单个模块，它的具体代码如下

```javascript
// 编译单个模块，客户端完全处理模式
function buildSingleModule (app, mod, conf, args) {
  if (!mod) {
    mod = conf.moduleConf.module;
  }
  conf = getConf(app, mod);
  // 删除之前的编译缓存
  del.sync(path.join(conf.modulePath, 'dist'));
  var allPromise = taskList.all($, conf.appConf, conf.moduleConf, args);
  var sassPromise = taskList.sass($, conf.appConf, conf.moduleConf, args);
  var lessPromise = taskList.less($, conf.appConf, conf.moduleConf, args);
  var csslintPromise = taskList.csslint($, conf.appConf, conf.moduleConf, args);
  var jshintPromise = taskList.jshint($, conf.appConf, conf.moduleConf, args);
  var athenaMatePromise = taskList.athena_mate($, conf.appConf, conf.moduleConf, args);
  var stylesPromise = taskList.styles($, conf.appConf, conf.moduleConf, args);
  var scriptsPromise = taskList.scripts($, conf.appConf, conf.moduleConf, args);
  var compressPromise = taskList.compress($, conf.appConf, conf.moduleConf, args);
  var fontsPromise = taskList.fonts($, conf.appConf, conf.moduleConf, args);
  var imagesPromise = taskList.images($, conf.appConf, conf.moduleConf, args);
  var revPromise = taskList.rev($, conf.appConf, conf.moduleConf, args);
  var fetchCommonPromise = taskList.fetch_common($, conf.appConf, conf.moduleConf, args);
  var injectPromise = taskList.inject($, conf.appConf, conf.moduleConf, args);
  var tempPromise = taskList.temp($, conf.appConf, conf.moduleConf, args);

  $.util.log($.util.colors.green('开始编译模块' + mod + '！'));
  return allPromise(mod, conf.modulePath, conf.appPath)
    .then(sassPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(lessPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(csslintPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(jshintPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(athenaMatePromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(imagesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(stylesPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(scriptsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(compressPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(injectPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(fontsPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(revPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(fetchCommonPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tempPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(function (result) {
      $.util.log($.util.colors.green('结束编译模块' + mod + '！'));
      return Promise.resolve(result);
    }).catch(function (e) {
      if (e) {
        console.log(e.plugin);
        if (e.stack) {
          console.log(e.stack);
        }
      }
    });
}
```

可以看出，在编译前会先删除之前的编译缓存，然后调用所有需要的编译任务，通过`Promise`组合成一个执行顺序明确的任务流，例如这里的任务执行流程是

![Athena编译流程](http://ww2.sinaimg.cn/large/49320207gw1f2ssdq609mj205011ydgk.jpg)

#### 编译模式

经过一段时间的探索演进，目前Athena有2种编译模式，分别是

 - 在客户端进行代码合并的客户端完全处理**client模式**
 - 在静态服务器进行代码合并的**server模式**

而这两种模式下又要区分是编译出上线前代码的**build**，还是进行开发时的实时预览**serve**，build和serve需要执行的编译任务是不一样的，所以其实认为有4种模式也并无不可。

两种模式下大家开发时的代码写法完全一样，唯一的区分是在项目的`app-conf.js`中进行配置，配置项为`comboConf`如下

```javascript
module.exports = {
  app: 'nima',
  appId: '7024e980-8cd8-11e5-89fe-370bd1e969e9',
  description: '尼玛',
  common: 'gb',
  moduleList: ['gb', 'hh', 'lp'],
  platform: 'mobile',
  versionControl: 'git',
  comboConf: {
    mode: 'server', // server/client
    server: {
      flag: '??', // server端合并时的分割标识，如某Url //static.360buyimg.com/nima??/gb/common_d6e4c134.css,/hh/jj_5e52390b.css,/hh/topbar_17c154d1.css,/hh/banner_2dc311a1.css,/hh/hello_1ed059f2.css
      onlineDomain: '//static.360buyimg.com/', // 服务端合并的线上域名
      shortPath: 'nima' // 次级目录
    }
  }
...
}
```

`comboConf.mode`为`server`则是server模式，`client`即是client模式。

上面编译概述中的例子就是**client模式**的build过程，**client模式**和**server模式**体现在代码和文件上的区别主要是在，若方法名最后是以`Server`结束，则是**server模式**中调用的方法，若文件名最后以`_server`结束，则是**server模式**中调用的文件，若没有则一般是**client模式**调用，或两种模式可以通用。

#### 预览

`ath serve`命令可以实现实时预览，它的具体实现逻辑可以在`/lib/build/index.js`中找到，以**client模式**为例，预览单个模块的主要执行`buildSingleModuleSimple(app, mod, conf, args)`函数中的逻辑，在这个函数中调用预览需要的编译任务，编译完后再打开静态服务器**maltose**，将`.temp`目录作为预览目录，同时watch相应文件改动完成对应的编译任务。

这里需要注意的是`ath serve`和`ath build`所执行的编译任务不一样的，`ath serve`的编译任务相对简单很多，为了保证开发时的响应速度，它不需要完成像图片压缩、文件MD5、代码压缩等操作。

### 创建逻辑

创建项目、模块、页面、组件的逻辑均在`create`目录下，其中`base.js`是所有创建类的基类，包括拷贝文件、创建目录，以及请求远程模板的逻辑方法。

`create`目录中`task`是几个创建类，均继承自`Base`类

 - `App`类，创建项目
 - `Module`类，创建模块
 - `Page`类，创建页面
 - `Widget`类，创建组件

每个类实现几个特定的方法，例如`App`类

```javascript
var App = Base.extend({
  // 构造函数
  construct: function (options) {
    this.conf = _.assign({
      appName: null,
      description: '',
      sass: false,
      less: false
    }, options);
    this.super.apply(this, arguments);
    this.init();
  },

  // 初始化逻辑
  init: function () {...},

  // 输出询问信息
  talk: function () {...},

  // 拷贝模板文件，创建相应目录
  write: function () {...}

  // 创建
  create: function () {...}
});
```

`create`目录中`templates`存放的是最基础的默认模板，一般情况下会从管理平台下载最新的模板缓存到本地然后使用，但当网络或管理平台出现故障，且本地没有模板缓存时，会去使用这个默认模板。

### 缓存

#### dist

在`ath build`和`ath serve`时会产生编译时缓存目录`dist`，放在模块目录下，`dist`目录中的文件目录主要有


    ├── dist                     - 通过编译生成的目录
    │   ├── _                   - 源代码拷贝目录
    │   ├── _static             - 编译过程中的静态文件
	│   ├── output              - 真正用来上线的目录
	│   ├── map.json            - 通过编译后生成页面/widget依赖关系已经页面引用资源、资源md5对应表
	│   ├── data.json           - 组件调用传入参数收集

在每次编译开始时会将这个目录删掉。

#### .athena

`.athena`目录位于用户根目录下，在**Mac**上是`~/.athena`，**windows**上是`C:\Users\[usernam]\.athena`，是用来存放Athena的配置和使用中产生的缓存的，目录下的`config.json`存放了一些配置项，如用户名和工作目录

```javascript
{
  "work_space": "/Users/luckyadam/project/temp",
  "user_name": "luckyadam"
}
```

通过命令`ath list-config`可以列出这些配置项

同时这里存放了下载的模板，以及发布时的已发布文件的md5，以此来进行上传时过滤已经上传的文件，缓存文件会区分项目、模块以及发布的机器。

编译时的sass编译缓存和图片压缩后的缓存放在`.athena/cache`目录下，这样文件处理一次后就会缓存下来，通过md5校验，同样的文件只需要处理一次就好。

通过`ath clear`命令可以清除上述缓存。

### app-conf.js

完整的`app-conf.js`如下

```javascript

'use strict';

module.exports = {
  app: 'qwd', // 项目名称
  appId: 'd562b930-be56-11e5-8027-b52041f428b5', // 项目ID
  description: 'demo',
  platform: 'pc', // 平台 pc or mobile
  common: 'gb', // 公共模块
  moduleList: ['gb', 'frs', 'test'], // 项目下模块列表，通过athena module命令生成模块时会自动往此处添加新模块名
  tmpId: 'default', // 选用模板
  versionControl: 'git', // 标记当前项目使用的版本控制工具，目前只有git，若设置了，则在发布时将经过代码是否已提交远程仓库的检测
  shtml: {  //页面片配置
    use: true, //是否使用
    needCombo: true // 页面片中链接是否合并
  },
  useInclude: { // 启用生成html页面片功能
    folder: 'include', // 生成页面片目录名字
    pathPrefix: 'include', //页面片路径前缀 include/header.html
    files: { // 需要生成的页面片文件
      'header.html': { // 文件名，文件对应的widget组件信息
        module: 'gb',
        widget: 'mod_hd'
      }
    }
  },
  comboConf: {  // 文件合并模式，server模式为文件在服务器端合并，client即文件通过工具本地合并
    mode: 'server', // server/client
    server: {
      flag: '??', // server端合并时的分割标识，如某Url //static.360buyimg.com/nima??/gb/common_d6e4c134.css,/hh/jj_5e52390b.css,/hh/topbar_17c154d1.css,/hh/banner_2dc311a1.css,/hh/hello_1ed059f2.css
      onlineDomain: '//static.360buyimg.com/', // 服务端合并的线上域名
      shortPath: 'nima' // 次级目录
    }
  },
  deploy: {  // 需要发布时的配置
    local: { // 不涉及到部署至哪台机器
      fdPath: '/' // 需要放置的目录
    },
    preview: { // 预览机的配置，名字不能修改，配置内容可以随自己需求修改
      host: 'labs.qiang.it', // 机器host
      user: '', // 用户名
      pass: '', // 密码
      port: 21, // 端口
      fdPath: '/h5/', // 需要放置的目录
      domain: 'labs.qiang.it', // 机器域名
      remotePath: '/labs.qiang.it/h5/qwd' // 上传到的目录
    },
    jdcfinder: { // jdcfinder
      mode: 'http',
      host: 'jdcfinder',
      user: '',
      pass: '',
      fdPath: '/fd/h5/',
      domain: 'jdc.jd.com',
      remotePath: '/fd/h5/nima', // 上传代码的目录
      cssi: '/sinclude/cssi/fd/h5/qwd', // 上传页面片的目录
      assestPrefix: '/fd/h5/qwd', // 发布完静态资源后，静态资源路径
      shtmlPrefix: '/sinclude/cssi/fd/h5/qwd' // 发布完页面片后，静态资源路径
    },
    jdTest: {
      host: '192.168.193.32',
      user: '',
      pass: '',
      port: 22,
      fdPath: '/fd/h5/',
      domain: 's.paipaiimg.com',
      remotePath: '/export/paipai/resource/static/fd/h5/hellokity', // 上传代码的目录
      cssi: '/export/paipai/resource/sinclude/cssi/fd/h5/hellokity', // 上传页面片的目录
      assestPrefix: '/static/fd/h5/hellokity', // 发布完静态资源后，静态资源路径
      shtmlPrefix: '/sinclude/cssi/fd/h5/hellokity' // 发布完页面片后，静态资源路径
    }
  }
};
```

### module-conf.js

完整的`module-conf.js`如下

```javascript
'use strict';

module.exports = {
  creator: 'luckyadam',  // 模块创建者
  app: 'hw',  // 项目名称
  common: 'gb',  // 公共模块名称
  module: 'mm',  // 当前模块名
  moduleId: 'c4248360-8cd8-11e5-a75b-1f4efad69e34', // 模块ID
  description: 'test',  // 模块简要信息
  support : {  
    csslint: {
      enable: true //是否开启
    },
    jshint: {
      enable: true //是否开启
    },
    imagemin: { // 图片压缩的配置
      exclude: ['banner.png'] // 图片压缩排除的图片
    },
    autoprefixer: { // 自动前缀的配置
      pc: [
        'last 3 versions',
        'Explorer >= 8',
        'Chrome >= 21',
        'Firefox >= 1',
        'Edge 13'
      ],
      mobile: [
        'Android >= 4',
        'iOS >= 6'
      ]
    },
    px2rem: {  // px转rem配置
      enable: false,  // 是否开启
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
    csssprite: { //css雪碧图合并配置
      enable: true,
      retina: false  //是否支持retina
    }
  }
};
```

## 辅助项目

> Athena还有一些自己开发或借鉴第三方项目修改过来的辅助项目。

### 项目列表

#### **maltose**

静态服务器，用来取代之前的**browser-sync**，同时包含livereload功能

项目地址[https://github.com/o2team/maltose](https://github.com/o2team/maltose)

#### **athena-png-native**

png图片压缩，源码改自第三方项目[node-pngquant-native](https://github.com/xiangshouding/node-pngquant-native)

项目地址[https://github.com/o2team/athena-png-native](https://github.com/o2team/athena-png-native)

#### **postcss-athena-spritesmith**

针对Athena订制的CSS雪碧图工具，源码改自[postcss-sprite](https://github.com/2createStudio/postcss-sprites)

项目地址[https://github.com/o2team/postcss-athena-spritesmith](https://github.com/o2team/postcss-athena-spritesmith)

### 如何开发

这些项目进行开发测试的时候，也是使用`npm link`命令，不过有所不同

```
// 先clone项目
$ git clone git@github.com:o2team/maltose.git
// 进入项目目录
$ cd maltose
// 链接
$ npm link
// 进入到athena目录下
$ cd xxx/athena
// 链接maltose
$ npm link maltose
```

执行完上述命令后即可进行实时修改代码调试了。

## 一个添加新功能的例子

### 需求

给需要上线的文件加上Athena版权信息：Copyright@athena 1.0.0，并且HTML/JS/CSS的版权信息注释不一致

### 开发步骤

#### 分析

既然是要在要上线的文件中添加，那么我们写一个编译任务`copyright`将它插入`temp`任务之前即可

```javascript
allPromise(mod, conf.modulePath, conf.appPath)
...
	.then(revPromise.bind(null, mod, conf.modulePath, conf.appPath))
	.then(fetchCommonPromise.bind(null, mod, conf.modulePath, conf.appPath))
	.then(copyrightPromise.bind(null, mod, conf.modulePath, conf.appPath))
    .then(tempPromise.bind(null, mod, conf.modulePath, conf.appPath))
```

#### 任务copyright.js

在`/lib/build/task`目录中新增`copyright.js`，获取所有需要上线的文件，在每个文件的第一行新增版权信息，实现逻辑如下

```javascript
'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var through2 = require('through2');
      var path = require('path');
      var Util = require('../../util');

	  var copyright = 'Copyright@Athena ' + Util.getPkgInfo().version;
      // 找到上线前所有文件
      return vfs.src(path.join(modulePath, 'dist', 'output', '**'))
        .pipe(through2.obj(function (file, encoding, cb) {
	      if (file.isNull() || file.isDirection() || file.isStream()) {
	        return cb(null, file);
          }
          var fPath = file.path;
          var content = file.contents.toString();

          // 使用Util中的正则
          // 如果是模板
          if (Util.regexps.tpl) {
            copyright = '<!-- ' + copyright + ' -->';
          } else if (Util.regexps.css) {
            copyright = '/***** ' + copyright + ' *****/';
          } else if (Util.regexps.js) {
            copyright = '// ' + copyright;
          }
          content = copyright + '\n' + content;
          file.contents = new Buffer(content);
          this.push(file);
          cb();
        }))
        .pipe(vfs.dest(path.join(modulePath, 'dist', 'output')))
        .on('finish', function() {
          resolve();
        }).on('err', function (err) {
          reject(err);
        });
    });
  }
};
```

#### 抽离出插件

可以注意到上面代码包含了一个小型插件的逻辑，所以我们可以把加版权信息的功能做成一个插件，这样就可以进行复用

在`/lib/build/athena_mate`中新增`athena_copyright.js`文件，同时在`index.js`中将它暴露出来。

```javascript
// /lib/build/index.js
...
var copyright = require('./athena_copyright');

module.exports = {
  ...
  copyright: copyright
};
```

```javascript
// /lib/build/athena_mate/athena_copyright.js

'use strict';

var through2 = require('through2');
var path = require('path');
var Util = require('../../util');

var PLUGIN_NAME = 'athena_copyright';
var copyright = 'Copyright@Athena ' + Util.getPkgInfo().version;
module.exports = function () {
  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull() || file.isDirection() || file.isStream()) {
      return cb(null, file);
    }
    var fPath = file.path;
    var content = file.contents.toString();

    // 使用Util中的正则
    // 如果是模板
    if (Util.regexps.tpl) {
      copyright = '<!-- ' + copyright + ' -->';
    } else if (Util.regexps.css) {
      copyright = '/***** ' + copyright + ' *****/';
    } else if (Util.regexps.js) {
      copyright = '// ' + copyright;
    }
    content = copyright + '\n' + content;
    file.contents = new Buffer(content);
    this.push(file);
    cb();
  });

  return stream;
};

```

然后我们可以在任务中调用它

```javascript
// /lib/build/tasks/copyright.js

'use strict';

module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var vfs = require('vinyl-fs');
      var path = require('path');
      var athenaMate = require('../athena_mate');

      // 找到上线前所有文件
      return vfs.src(path.join(modulePath, 'dist', 'output', '**'))
        .pipe(athenaMate.copyright())
        .pipe(vfs.dest(path.join(modulePath, 'dist', 'output')))
        .on('finish', function() {
          resolve();
        }).on('err', function (err) {
          reject(err);
        });
    });
  }
};
```

最后我们需要在编译入口文件`/lib/build/index.js`中进行调用，将任务插入到`temp`任务之前。

## 一些接口

与管理后台通信的接口，管理后台地址在项目根目录下的`.setting.json`中有配置

- `/api/commands` 操作命令统计上报
- `/api/delete` 删除数据上报
- `/api/version` 获取Athena版本号
- `/api/upload` 统计代码包上传
- `/api/gb/version` 获取公共模块**map.json**文件版本号
- `/api/gb` 获取公共模块**map.json**
- `/api/templates` 获取远程模板信息
- `/api/template/download` 下载远程模板

## 命令总结

### ath init

[详情](https://github.com/o2team/athena/blob/master/README.md#初始化)

初始化Athena，目前主要实现填写用户名，以及设置工作目录

### ath app

[详情](https://github.com/o2team/athena/blob/master/README.md#生成新项目)

生成新项目

### ath module

[详情](https://github.com/o2team/athena/blob/master/README.md#新增模块)

新增模块

### ath page

[详情](https://github.com/o2team/athena/blob/master/README.md#新增页面)

新增页面

### ath widget

[详情](https://github.com/o2team/athena/blob/master/README.md#新增widget)

新增组件

### ath delete

[详情](https://github.com/o2team/athena/blob/master/README.md#删除命令)

可以进行 项目、模块、页面、组件 的删除

### ath build

[详情](https://github.com/o2team/athena/blob/master/README.md#athena-build)

编译

### ath serve

[详情](https://github.com/o2team/athena/blob/master/README.md#athena-serve)

实时预览

### ath publish

[详情](https://github.com/o2team/athena/blob/master/README.md#athena-publish)

发布

### ath clone

[详情](https://github.com/o2team/athena/blob/master/README.md#athena-clone)

复制widget

### ath clear

[详情](https://github.com/o2team/athena/blob/master/README.md#athena-clear)

清除缓存

### ath update

[详情](https://github.com/o2team/athena/blob/master/README.md#athena-update)

主动检测并更新Athena到最新版本

### ath list-config

[详情](https://github.com/o2team/athena/blob/master/README.md#athena-list-config)

列出Athena配置

### ath list-setting

[详情](https://github.com/o2team/athena/blob/master/README.md#athena-list-setting)

列出Athena设置

## 注意事项

请在完全了解代码意图后再进行开发。
