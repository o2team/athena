athena-html
===
[![npm](https://img.shields.io/npm/v/athena-html.svg?maxAge=2592000&style=flat-square)](https://www.npmjs.com/package/athena-html)
[![npm](https://img.shields.io/npm/dm/athena-html.svg?maxAge=2592000&style=flat-square)](https://npmjs.com/package/athena-html)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://raw.githubusercontent.com/o2team/athena/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/o2team/athena.svg?style=flat-square)](https://github.com/o2team/athena/stargazers)

> O2Team构建项目流程工具，可以生成相应目录和代码，同时对项目进行编译
>
> 一次安装，到处运行

```
    ___  _   _
   / _ \| | | |
  / /_\ \ |_| |__   ___ _ __   __ _
  |  _  | __| '_ \ / _ \ '_ \ / _` |
  | | | | |_| | | |  __/ | | | (_| |
  \_| |_/\__|_| |_|\___|_| |_|\__,_|
```

## 功能一览

### 创建项目

- [x] 生成项目、模块、页面、组件文件结构

### 编译预览

- [x] 轻量组件化功能
- [x] 根据组件加载情况生成资源依赖表
- [x] 页面、组件html编译
- [x] Sass/less 编译
- [x] csslint/jshint 代码检查
- [x] CSS合并压缩
- [x] CSS prefix，px转rem
- [x] JS合并压缩
- [x] 自动生成雪碧图，自动多倍图
- [x] 文件内联，自定义图片转base64
- [x] 图片压缩
- [x] 字体压缩
- [x] 文件MD5戳
- [x] 本地预览

### 项目部署

- [x] 资源定位（图片等资源路径替换）
- [x] 生成CSS页面片
- [x] 部署到预览机和开发机

## ChangeLog

请见[ChangeLog](CHANGELOG.md)

## 加入开发

请见[开发指引](DEVELOP_GUIDE.md)

## 安装

基于``node``，请确保已具备较新的node环境（>=0.12.0），推荐使用node版本管理工具[nvm](https://github.com/creationix/nvm)，这样不仅可以很方便地切换node版本，而且全局安装时候也不用加sudo了。

安装本项目 **athena-html**

```
$ [sudo] npm install -g athena-html
```

由于国外源实在太慢，建议使用国内源来安装

```
$ [sudo] npm i -g athena-html --registry=http://registry.npm.taobao.org --disturl=http://npm.taobao.org/mirrors/node
```

目前已支持**sass/less**文件的编译，使用**sass**需要使用ruby安装**compass**

```
$ [sudo] gem install compass
```
由于墙的缘故（你懂的），原始的gem源[https://rubygems.org/](https://rubygems.org/)几乎无法使用，建议将gem源替换成淘宝的源

```
$ gem sources --add https://ruby.taobao.org/ --remove https://rubygems.org/
$ gem sources -l
*** CURRENT SOURCES ***

https://ruby.taobao.org
# 请确保只有 ruby.taobao.org
$ gem install compass
```

## 项目结构

一个项目对应一个目录，项目中可以包含多个 **模块** ，项目将由以下结构组成


    ├── module1                 - 模块1
    ├── module2                 - 模块2
    ├── module3                 - 模块3
    └── app-conf.js             - 项目的配置信息

项目中模块将由以下结构组成

    ├── dist                    - 通过编译生成的目录
    │   ├── output              - 真正用来上线的目录
    │       ├── combofile       - publish时用来存放生成页面和页面片文件的目录
    │       ├── css             - 通过编译生成的css文件
    │       ├── js              - 通过编译生成的js文件
    │       ├── images          - 通过编译压缩后的images文件
    │       ├── page1.html      - 通过编译生成的页面html
    │   ├── map.json            - 通过编译后生成页面/widget依赖关系已经页面引用资源、资源md5对应表
    |
    ├── page                    - 所有页面目录
    │   ├── page                - 某一页面目录
    │       ├── images          - 页面的图片目录
    │       ├── page.css        - 页面级css
    │       ├── page.js         - 页面级js
    │       ├── page.html       - 页面html
    │
    ├── static                  - static目录一般用来存放需要引用的第三方的资源文件，需要配合``static-conf.js``来使用
    │   ├── css                 - 额外的css文件
    │   ├── js                  - 额外的js文件
    │   ├── images              - 额外的image文件
    │  
    ├── widget                  - 所有widget目录
    │   ├── widget              - 某一widget目录
    │       ├── images          - widget的图片目录
    │       ├── widget.css      - widget的css
    │       ├── widget.js       - widget的js
    │       ├── widget.html     - widget的html
    │
    ├── static-conf.js          - 需要额外引用的静态资源的配置
    │
    └── module-conf.js          - 模块的配置信息

在这种项目组织方式中，将页面拆分成各个widget组件，在页面中通过加载各个widget的方式来拼装页面，再经过编译，生成正常页面。

### 公共模块gb

在创建项目时，每个项目都会默认拥有一个公共模块 **gb** 。

普通模块只允许调用公共模块 **gb** 的公共的组件、css或js，而不允许调用其他普通模块的资源。

## 快速开始

基于命令 ``athena``，同时提供了简写``ath``

### 初始化

首先需要初始化Athena，在这一步会有初始化工作目录、输入用户名等操作

```
$ ath init [工作目录]
```

### 生成新项目

生成一个新的项目目录

```
$ ath app [项目名称]
```

或者使用简写 ``ath a [项目名称]``,``ath app -h``可以看到该命令的使用方式

同时提供了通过携带参数快速创建项目的命令

```
$ ath a --name lo --description 测试 --sass --template 默认模板

```

参数 `--name` 指定项目名称

参数 `--description` 指定项目描述

参数 `--sass` 指定项目使用 `sass`

参数 `--less` 指定项目使用 `less`

参数 `--template` 指定项目使用的模板，输入模板名称，默认模板是 `默认模板`

每个参数都是可缺省的。

然后根据提示一步一步来，将会自动生成项目的结构和所需文件代码

### 新增模块

在某一项目中新增一个模块，比如在项目 **wd** 中新增一个 **open** 模块，需要在项目根目录下执行

```
$ ath module [模块名]
```

或者使用简写 ``ath m [模块名]``,``ath module -h``可以看到该命令的使用方式

[模块名]参数指定模块，可以包含多个模块，多模块间使用 `,` 进行分隔

举个栗子

```
// 以下命令将创建my和hello两个模块
ath m my,hello
```

同时提供了通过携带参数快速创建模块的命令

```
$ ath m --name hhh --description 测试 --sass
```

参数 `--name` 指定模块名称

参数 `--description` 指定模块描述

参数 `--sass` 指定模块使用 `sass`

参数 `--less` 指定模块使用 `less`

每个参数都是可缺省的。

然后根据提示一步一步来，将会自动生成项目的结构和所需文件代码

### 新增页面

在某一模块下新增一个页面，**进入到该模块** 下，执行

```
$ ath page [页面名]
```

或者使用简写 ``ath pa [页面名]``,``ath page -h``可以看到该命令的使用方式

同时提供了通过携带参数快速创建页面的命令

```
$ ath pa --name hello --description 测试 --sass --remote jd
```

参数 `--name` 指定页面名称

参数 `--description` 指定页面描述

参数 `--sass` 指定页面使用 `sass`

参数 `--less` 指定页面使用 `less`

参数 `--remote` 指定页面属于域，目前分别有 `tencent` 和 `jd`

每个参数都是可缺省的。

然后根据提示一步一步来，将会自动生成athena的页面目录和模板

### 新增widget

在某一模块下新增一个widget组件，**进入到该模块** 下，执行

```
$ ath widget [组件名]
```

或者使用简写 ``ath w [组件名]``,``ath widget -h``可以看到该命令的使用方式

同时提供了通过携带参数快速创建组件的命令

```
$ ath w --name topbar --sass --description 测试
```

参数 `--name` 指定组件名称

参数 `--description` 指定组件描述

参数 `--sass` 指定组件使用 `sass`

参数 `--less` 指定组件使用 `less`

参数 `--cms` 指定这是供CMS使用的楼层组件

每个参数都是可缺省的。

然后根据提示一步一步来，将会自动生成athena的widget目录和模板

### 删除命令

通过命令 ``athena delete`` 可以进行 **项目**、**模块**、**页面**、**组件** 的删除，请遵循以下场景使用

命令简写 ``ath del``

#### 场景一

在项目目录外，可以使用如下命令来进行删除

```
// 删除当前目录下项目
$ ath del -a [项目名]

// 删除当前目录下项目的某一模块
$ ath del -a [项目名] -m [模块名]

// 删除当前目录下项目的某一模块中的某一页面
$ ath del -a [项目名] -m [模块名] -p [页面名称]

// 删除当前目录下项目的某一模块中的某一组件
$ ath del -a [项目名] -m [模块名] -w [组件名称]
```

#### 场景二

在项目目录下，可以使用如下命令来进行删除

```
// 删除当前项目的某一模块
$ ath del -m [模块名]

// 删除当前项目的某一模块中的某一页面
$ ath del -m [模块名] -p [页面名称]

// 删除当前项目的某一模块中的某一组件
$ ath del -m [模块名] -w [组件名称]
```

#### 场景三

在模块目录下，可以使用如下命令来进行删除

```
// 删除当前模块的某一页面
$ ath del -p [页面名称]

// 删除当前模块的某一组件
$ ath del -m [模块名] -w [组件名称]
```

## 使用及编译

### 编译模式

过一段时间的探索演进，目前Athena有2种编译模式，分别是

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

### 模块化

通过阅读设计稿，我们可以将页面拆分成不同``widget``，而一些可以通用的``widget``我们可以放到一个公共模块中去统一管理，通过这样的页面组件化方式，我们可以很好地避开复制代码的问题，同时让我们的代码更好管理。

在执行``athena page [pageName]``命令生成页面后，可以发现在模块的``page``目录下多了一个以刚刚输入的页面名称``pageName``作为名字的目录，这个目录下面包含 **html/js/css** 三个文件。在``html``文件中一般通过加载各个``widget``的方式来进行开发，具体代码如下：

```
<%= widget.load('user') %>
<%=
	widget.load('user', {
		param: 'test'
	})
%>
<%= widget.load('user', null, 'gb') %>
```
``widget.load``可以方法接收三个参数，第一个参数是``widget``的名称，后面两个参数是可选参数，第二个是向``widget``传递的一些参数，第三个是``widget``所属的模块，如果是本模块，可以不传。

### 页面中API

#### widget.load

如前一小节所显示，用来加载组件

#### widget.loadFloor

``widget.load`` 的变种，用来加载CMS解决方案中的楼层，参数与``widget.load``方法一致，默认加载 **widget** 目录中的 `data.json` 文件，但需要注意的是，目前这个方法只有在开启**server**模式才有效。

#### widget.loadFloorSmarty

``widget.load`` 的变种，用来加载使用Smarty语法编写的楼层或元件，参数与``widget.load``方法一致，默认加载 **widget** 目录中的 `custom_data.json` 文件，但需要注意的是，目前这个方法只有在开启**server**模式才有效。

#### getCSS

使用方式 `<%= getCSS() %>`

用来输出页面所需引用的**CSS Link**，可传入3个参数，第一个参数是`CSS` 样式表的名称，第二个参数是模块名，第二个参数是是否加入页面片中（client模式）。如果什么都不传则默认输出与当前页面同名的样式表。例如：

当前模块`hello`中有一页面为`mine.html`，在页面`<head>`标签中调用`<%= getCSS() %>`将输出

```
<link rel="stylesheet" type="text/css" href="css/mine.css" combo-use="/hello/css/mine.min.css">
```
若第三个参数为 `inline` ，则该样式文件会以内联的形式写入页面片中（client模式）。

#### getJS

与上述`getCSS`相似，将输出页面所需引用的脚本文件，参数与`getCSS`保持一致。

当前模块`hello`中有一页面为`mine.html`，在页面`<body>`标签最后调用`<%= getJS() %>`将输出

```
<script src="js/mine.js" combo-use="/hello/css/mine.min.js"></script>
```

若第三个参数为 `inline` ，则该样式文件会以内联的形式写入页面片中（client模式）。

**注意**

* 这些API调用语句末尾不要加分号

### app-conf.js

在**项目**的根目录下生成的文件中，**app-conf.js** 文件是一个通过传入配置项生成的关于本项目的配置文件，我们可以看到它包含如下配置：

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
    use: true, //是否使用，总控制，若要开启使用页面片，这里必须为true
    needCombo: true, // 页面片中链接是否合并
    needTimestamp: true //增加时间戳
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
      shtmlPrefix: '/sinclude/cssi/fd/h5/qwd', // 发布完页面片后，静态资源路径
      shtmlCommentPrefix: '/sinclude/cssi/fd/h5/qwd', // 生成页面片注释中的路径
      shtml: {  //针对服务器的页面片配置
        needCombo: true, // 页面片中链接是否合并
        needTimestamp: true //增加时间戳
      }
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
      shtmlPrefix: '/sinclude/cssi/fd/h5/hellokity', // 发布完页面片后，静态资源路径
      shtmlCommentPrefix: '/sinclude/cssi/fd/h5/hellokity', // 生成页面片注释中的路径
      shtml: {  //针对服务器的页面片配置
        needCombo: true, // 页面片中链接是否合并
        needTimestamp: true //增加时间戳
      }
    }
  }
};

```
其中 **app**、**common** 配置项 **不要** 修改，我们需要重点关注 **deploy** 这个配置项，这是发布到一些机器上的配置，可以注意到用户名和密码是空的，我们需要自己去完善它，同时上传的目录可以根据自己的需要进行修改。

需要注意的是 **local** 、**preview** 是特殊配置项，其中 **preview** 代表需要发布到的预览机器，这两者的名字 **不可修改** ，目前配置中有配置了两台开发机，分别是 *tencnet* 和 *jdTest*，若需要发布到其他开发机请自行仿照增加配置。

### module-conf.js

包含模块的一些配置信息

```javascript

'use strict';

module.exports = {
  creator: 'luckyadam',  // 模块创建者
  app: 'hw',  // 项目名称
  common: 'gb',  // 公共模块名称
  module: 'mm',  // 当前模块名
  description: 'test',  // 模块简要信息
  support : {  
    useHash: {
      enable: true // 是否启用文件hash
    },
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
      enable: true, // 是否开启
      retina: true,  //是否支持retina
      rootValue: 40, // px转rem，若不想转rem，此处应为0
      padding: 10, // 图与图之间的距离
      spriteFolder: 'sprites' // 雪碧图放置目录，若不想将雪碧图单独放置目录，此处为空或不传
    },
    base64: {
      enable: false, // 表示是否开启统一转换
      exclude: [], // 排除图片，例如 images/icon.png
      size: 5000 // 小于5000b的图片就会转
    }
  }
};
```

### static-conf.js

需要引用`static`目录下资源的配置，由使用者自定义，一般可以用来自定义配置一些需要额外引用的第三方库文件，例如：

在`static/css`目录下存在`t1.css`，`t2.css`两个资源，需要将这两个资源引用到页面中，那么可以在该文件中增加如下配置

```javascript

'use strict';

module.exports = {
  staticPath: {
    'test.css': [
      'static/css/t1.css',
      'static/css/t2.css'
    ]
  }
};

```

`test.css` 是自定义的合并后css名称，若要在页面中引用，只需调用 `<%= getCSS('test.css') %>` 即可。引用js文件同理

需要注意的是：

* `test.css` 需带上后缀以示区分
* 引用的资源路径，从static目录开始写全，如 `static/css/t1.css`

### map.json

**map.json** 文件是通过执行编译任务后生成一个标识依赖关系的文件，文件中包含了当前模块所有页面所依赖的 **widget** 组件的信息，同时还有页面引用静态资源的信息，资源md5后资源名称的对应关系，它的文件结构如下

```
{
  "dependency": {
  	"find.html": [],
 	  "index.html": [],
 	  "open.html": [],
 	  "open1.html": [],
  	"open3.html": [],
  	"shop.html": [
   	 {
      	"widgetName": "topbar",
      	"param": {
        	"topbar": "微信"
      	},
      	"module": "test",
      	"exists": true
     }
   ],

   "include": {
    "test.html": {
      "css": [
        {
          "name": "gb.css",
          "module": "gb"
        },
        {
          "name": "test.css",
          "module": "mm"
        },
        {
          "name": "t.css",
          "module": "mm"
        }
      ],
      "js": [
        {
          "name": "test.js",
          "module": "mm"
        }
      ]
    }
  }
}

```

### athena build

在编写完页面后可以通过``athena build``命令来执行对整个项目的编译，编译后的结果生成在各个模块的``dist``目录下。

``build`` 可简写成 ``b``。

同时你可以通过传入参数来决定你需要编译的模块，[模块名]参数指定模块，可以包含多个模块，多模块间使用 `,` 进行分隔

```
$ athena build --module [模块名]
```

命令简写

```
$ ath b -m [模块名]
```

携带参数``--verbose``可以看到编译过程中的一些详细信息

携带参数``--pack``将进入打包模式，只输出静态稿压缩包到项目目录下，如果只是制作静态稿，可以使用这种模式

携带参数``--compress``页面将引用压缩后md5重命名的资源

携带参数``--remote``将根据输入的机器名来生成对应机器所需要的可上线文件，包括页面片，执行后所有可上线文件均在模块 **dist/output** 目录下，机器名和 **app-conf.js** 中配置的机器名一致

注意``--pack``和``--remote``不要同时使用

携带参数``--release``将编译出可上线文件

携带参数 ``--allin`` 在使用server模式编译时会同时产生出合并后的资源文件

使用``ath b -h`` 查看帮助。

**每次对公共模块gb编辑完后，都需要重新编译gb模块，第一次获取项目后也需要编译一次公共模块gb**

### athena serve

通过``athena serve``命令可以实时预览正在编辑的页面。你可以在根目录执行这个命令，也可以进入到具体模块目录下去执行这个命令。

``serve`` 可简写成 ``s``。

如果在项目根目录下，可以通过携带参数来决定要浏览的页面：
```
$ athena serve --module [模块名] --page [页面名]
```

如果在模块目录下，可以通过携带参数来决定要浏览的页面：
```
$ athena serve --page [页面名]
```
命令简写

```
$ ath s -m [模块名] --page [页面名]
```

同时你可以通过传入参数来决定你需要编译的模块，[模块名]参数指定模块，可以包含多个模块，多模块间使用 `,` 进行分隔

```
$ ath s -m gb,home
```

携带参数``--dist``将可以预览经过完整编译流程后生成的文件

**建议只serve当前正在修改的模块，因为只serve模块的话会快很多**

执行预览页面后会自动打开浏览器，届时将能看到整个项目的站点地图

![站点地图](http://ww3.sinaimg.cn/large/49320207gw1ez2fkib9g9j218m0yogoq.jpg)

### athena publish

``athena publish`` 会将模块重新编译后发布到 ``app-conf.js`` 中配置的机器（包括预览机和开发机）上，同时会将压缩并重命名后的css文件和动态生成的页面片文件发布到机器的对应目录下（预览机器除外）。而在每次执行 ``athena publish`` 后页面片中的时间戳将会自动更新。目前配置了发布到腾讯和京东域的开发机，机器代号分别是 *tencent*
*jdTest*，同时可发布到预览机 *labs.qiang.it* 上。在 ``athena publish`` 的过程中，你可以自行选择需要发布到开发机上的页面和对应静态资源。

``publish`` 可简写成 ``pu``。

在模块目录下执行这个命令将会只发布本模块的页面。

在项目根目录下执行，可以通过传参来决定将发布哪些模块。[模块名]参数指定模块，可以包含多个模块，多模块间使用 `,` 进行分隔

```
$ athena publish --module [模块名]
```
命令简写

```
$ ath pu -m [模块名]
```

携带参数 ``--remote`` 指定要发布的机器，机器名和 **app-conf.js** 中配置的机器名一致

携带参数 ``--all`` 指定上传所有页面，无需再单独选择页面

使用``ath pu -h`` 查看帮助。

若发现上传文件一直错误，请使用 `$ ath clear --publish` 命令来清除文件发布的缓存以解决问题（请详见`ath clear` 命令的使用），并提出issue描述问题。

### athena clone

进入到某一模块下，通过``athena clone`` 命令可以复制另一个模块的**widget**到当前模块。

```
$ athena clone [组件名字] --from [来源模块] --to [目标模块，若是当前模块可省略]
```

使用``ath clone -h`` 查看帮助。

### athena widget-publish

发布某一组件到公共组件库

使用方式

```
$ athena widget-publish [组件名字]
$ athena widget-publish --widget [组件名字]
```
简写

```
$ ath wp [组件名字]
$ ath wp -w [组件名字]
```

### athena widget-load

从组件库下载某一组件

使用方式

```
$ athena widget-load [组件id] --alias [组件重命名]
$ athena widget-load --id [组件id] --alias [组件重命名]
```
简写

```
$ ath wl [组件id] -a [组件重命名]
$ ath wl -i [组件id] -a [组件重命名]
```

### athena map

用于列出某些依赖关系。

列出组件被页面引用的依赖关系

```
$ athena map [--module gb] --widget tab
```

若在项目目录下，则 `--module` 参数不可缺省，而在模块目录下则可缺省之，命令可简写为

```
$ ath map [-m gb] -w tab
```

示例：

![示例](http://ww4.sinaimg.cn/large/49320207gw1f5cbrbnstcj20dw05rjs5.jpg)

使用``ath map -h`` 查看帮助。

### athena clear

清除缓存，目前缓存包含 **模板文件** 、 **发布时的缓存文件**

若出现模板拉取获取项目发布存在问题，可尝试清除缓存来解决。

使用方式

```
$ athena clear
```
清除模板文件缓存

```
$ athena clear --template
// 简写
$ ath clear -t
```

清除发布时的缓存文件，请在项目或模块目录下执行，否则将清除所有的发布缓存文件！

```
// 若要删除当前项目的发布缓存
$ athena clear --publish
// 简写
$ ath clear -p
// 若要删除当前项目某一模块的发布缓存
$ athena clear --module xxx --publish
// 简写
$ ath clear -m xxx -p
```

清除sass编译的缓存文件，请在项目或模块目录下执行，否则将清除所有的sass缓存文件！

```
// 请在项目或模块目录下执行
// 若要删除当前项目的sass编译缓存
$ athena clear --sass
// 简写
$ ath clear -s
// 若要删除当前项目某一模块的sass编译缓存
$ athena clear --module xxx --sass
// 简写
$ ath clear -m xxx -s
```

清除图片压缩的缓存文件，请在项目或模块目录下执行，否则将清除所有的图片缓存文件！

```
// 请在项目或模块目录下执行
// 若要删除当前项目的图片压缩缓存
$ athena clear --image
// 简写
$ ath clear -i
// 若要删除当前项目某一模块的图片压缩缓存
$ athena clear --module xxx --image
// 简写
$ ath clear -m xxx -i
```

### athena update

```
$ athena update
```

将检测当前Athena版本是否最新，若是旧版本将自动安装最新版本Athena

简写

```
$ ath up
```

### athena list-config

可以列出Athena配置

```
$ athena list-config
```
简写

```
$ ath lc
```

将会得到如下输出

```
配置地址：/Users/luckyadam/project/jdc/athena-html/.config.json
user_name=luckyadam
work_space=/Users/luckyadam/project/temp
```

### athena list-setting

可以列出Athena设置

```
$ athena list-setting
```

简写

```
$ ath ls
```

将会得到如下输出

```
设置地址：/Users/luckyadam/project/jdc/athena-html/.setting.json
report_url=http://aotu.jd.com/athena
```

## 部分功能使用方法

### 代码检查

#### CSSLint

CSS代码检查。

通过配置 `module-conf.js` 里面的 `support` 中的 `csslint` 属性可以控制是否开启对本模块CSS代码进行检查，代码检查会在**编译**、**发布**时候进行。

CSSLint规则可以通过在项目目录下增加 `.csslintrc` 文件来进行配置，具体配置请见 [CSSLint Rules](https://github.com/CSSLint/csslint/wiki/Rules)。

代码检查的结果会生成进入当前模块目录下的 `csslint_error.html` 文件。

#### JSHint

JavaScript代码检查。

通过配置 `module-conf.js` 里面的 `support` 中的 `jshint` 属性可以控制是否开启对本模块JavaScript代码进行检查，代码检查会在**编译**、**发布**时候进行。

### 文件md5重命名

通过配置 `module-conf.js` 里面的 `support` 中的 `useHash` 属性可以控制是否开启对文件做md5重命名

### Sass的使用

全局的 **sass** 库文件放置在 **公共模块gb** 的 `static/sass` 目录下，目前会自动生成一个 `_common.scss` 库，包含一些常用的mixins、变量和方法，若需引入其他库文件，请以下划线 `_` 作为文件名的开始，直接放入 `static/sass` 目录下即可，随后在代码中这样引用：

需要在 `banner.scss` 中引用 `_common.scss` 中的 mixin `flexbox`

```
@import "common"; // 可以不带下划线

.banner {
  background: red;
  @include flexbox;
}
```

若要在一个模块中引入模块私有的sass库，可以将文件放入该模块的 `static/sass` 下，调用方式和上述一致。

一个模块中的sass文件只能引用本模块和公共模块中的sass库文件，为了区分公共模块和本模块的sass库，可以在 `static/sass` 目录下再建立一级目录，例如和所在模块同名的目录，这样引用时就可以就可可以区分了。例如，在 `_common.scss` 文件放在 `static/sass/gb` 目录下，这样引用的写法就是：

```
@import "gb/common"; // 可以不带下划线

```
 
若发现sass文件编译一直错误，请使用 `$ ath clear --sass` 命令来清除sass编译的缓存以解决问题（请详见`ath clear` 命令的使用），并提出issue描述问题。

注：之前工具自动生成项目没有自动生成 `static/sass` 目录，如需使用sass库，请自动创建该目录。

### 资源定位

资源定位是为了可以自动化将资源引用链接替换成配置好的目标地址。

在 `HTML` 模板中定位使用API `<%= uri() %>`

定位css

```
<%= uri('demo.css') %>
```

定位图片等放在images目录下的资源，必须带上images目录作为标记

```
<%= uri('images/bg.png') %>
```

在 `js` 中定位使用API `__uri`

```
__uri('demo.css')
__uri('images/bg.png')
```

### 文件内联

工具提供了将文件内容直接打印到页面中的功能，例如可以将一个 `CSS` 文件以内联的方式在 `HTML` 中引用。使用方式如下

在 `HTML` 模板中内联样式或脚本文件

```
// 第一个参数是文件名，第二个参数是模块名，如果是当前模块，可省略
<%= inline('demo.css', 'module') %>
```
API的第一个参数文件名是需要在模块 `static-conf.js` 文件中进行配置的，配置方式见上述文档中关于 `static-conf.js` 的使用说明。

而且需要注意的是，如果需要直接内嵌组件或页面的资源，即使只引用了一个组件的资源，也需要在 `static-conf.js` 中配置，而且如果配置中包含了组件或页面的资源，则最后打包的时候 `<%= getCSS() %>`、`<%= getJS() %>` 输出的资源中将不会再包含这个组件或页面的资源，以避免重复，例如

```
// demo.css

module.exports = {
  staticPath: {
    't.js': [
      'static/js/t1.js',
      'static/js/t2.js'
    ],
    'demo.css': [
      'widget/heheda/heheda.css',
      'widget/topbar/topbar.css'
    ]
  }
};
```
`__inline('demo.css')` 将直接输出组件 `heheda`、`topbar` 的合并样式，并且 `<%= getCSS() %>` 输出的样式表中将不会包含这两个组件样式。

在 `js` 中内联资源使用API `__inline`

```
// 第一个参数是文件名，第二个参数是模块名，如果是当前模块，可省略
__inline('demo.css', 'module')
```

同时，`inline` API是支持内联网络资源的，例如想要在模板中内联引入一段脚本，可以直接这样写

```
<%= inline('http://static.360buyimg.com/mtd/pc/cms/js/o2_ua.min.js') %>
```

若只想在预览时加载网络资源，发布时删去，则可以传入第二个参数 `debug` 来进行控制

```
// 以下写法，在页面发布时，会将这一句删掉，主要用于开发时调试之用
<%= inline('http://static.360buyimg.com/mtd/pc/cms/js/o2_ua.min.js', 'debug') %>
```

### 图片转base64

提供了两种方式来进行使用

第一种，在URL后面加上 `?__inline` 标识，这样会直接转base64；

第二种，通过在 `module-conf.js` 中增加配置，定义规则，来进行统一转换处理

```
// module-conf.js
support : {  
  base64: {
    enable: false, // 表示是否开启统一转换
    exclude: [], // 排除图片
    size: 5000 // 小于5000b的图片就会转
  }
}
```

### 图片压缩

目前主要针对png图片进行压缩，使用 [pngquant](https://pngquant.org/) 内核。我们可以选择**排除**掉不需要压缩的图片，配置`module-conf.js`里面的 `support` 中的 `imagemin` 属性如下即可：

```javascript
support : {  
  imagemin: {
    exclude: ['banner.png']
  }
}
```

### autoprefixer

我们提供了为CSS属性自动添加前缀的功能，同时区分了 **移动端** 和 **pc** 端，在`module-conf.js`中配置如下：

```javascript
support : {  
  autoprefixer: {
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
  }
}
```

在编译的时候会自动读取 **项目配置** **app-conf.js** 中的配置 `platform` 来决定是 `pc` 还是 `mobile`，例如如下代码

```css
.banner {
  transform: rotate(45deg);
  font-size: 50px;
}
```

在不同 `platform` 下将输出如下：

**pc**

```css
.banner {
  -webkit-transform: rotate(45deg);
     -moz-transform: rotate(45deg);
      -ms-transform: rotate(45deg);
          transform: rotate(45deg);
  font-size: 50px;
}
```

**mobile**

```css
.banner {
  -webkit-transform: rotate(45deg);
          transform: rotate(45deg);
  font-size: 50px;
}
```

### px转rem

自动将`px`转成`rem`，需要配置`module-conf.js`里面的 `support` 中的 `px2rem` 属性如下即可：

```javascript
support : {  
  px2rem: {
    enable: false,  // 是否开启
    root_value: 40,  // 1rem = 40px
    unit_precision: 5,
    prop_white_list: ['prop1','prop2'],  // prop1,prop2为需要转换的属性
    selector_black_list: ['prop3','prop4'],  // prop3,prop4为不需要转换的属性
    replace: true,  //替换原来的属性
    media_query: false
  }
}
```

假设上面的白名单属性设为`width`,`height`，下面举例转换过程：

#### source.css

```css
.demo {
  width: 80px;
  height: 100px;
  padding: 40px;
}
```

#### output.css

```css
.demo {
  width: 2rem;
  height: 2.5rem;
  padding: 40px;
}
```

### CSS雪碧图合并

将所有文件中`background`或者`background-image`引用到的带有`?__sprite`后缀的图片进行**雪碧图合并**，同时支持是否开启`retina`，需要在配置文件`module-conf.js`的`support`增加下面属性：

```javascript
support : {  
    csssprite: {
      enable: true, // 是否开启
      retina: true,  //是否支持retina
      rootValue: 40, // px转rem
      padding: 10, // 图与图之间的距离
      spriteFolder: 'sprites' // 雪碧图放置目录
    }
  }
```

> 上面的属性`rootValue`若设置为`0`表示不开启px转rem，若设置为非0正数，则表示`1rem=40px`，40为`rootValue`的值。
> 同时，若开启了`retina`属性，那么图片请自行修改为`@2x`,`@3x`后缀名，如：`help@2x.png`

以上面的配置为例，下面为转换过程，更多[参考](https://github.com/o2team/postcss-athena-spritesmith)

#### source.css

```css
body {
  background: url('images/ball.png?__sprite') no-repeat 0 0;
}

h1 {
 background-image: url('images/help.png?__sprite');
 background-repeat: no-repeat;
 background-position: 20px 30px;
}

.arrow {
  background: url('images/help@2x.png?__sprite') no-repeat 0 100px;width:40px;height:50px;
}

.logo {
  background: url('images/ball@2x.png?__sprite') no-repeat 100px 0;
}
```

#### output.css

```css
body { background-image:url(../images/sprite.png); background-position:-2.7rem 0; }

h1 { background-image:url(../images/sprite.png); background-position:0 0;}

.arrow { background-image:url(../images/sprite.@2x.png); background-position:0 0; background-size:2.75rem 3.25rem;width:1rem;height:1.25rem;}

.logo { background-image:url(../images/sprite.@2x.png); background-position:-1.35rem 0; background-size:2.75rem 3.25rem;}
```

同时，提供了自定义生成多张雪碧图的功能，例如引用图片A/B/C/D，想要让A/B生成雪碧图`sprite_1`，C/D生成雪碧图`sprite_2`，则可以通过分别携带后缀`?__sprite=sprite_1`和`?__sprite=sprite_2`来生成两张雪碧图。

#### source.css

```css

.a {
  background-image: url('images/A.png?__sprite=sprite_1');
}

.b {
  background-image: url('images/B.png?__sprite=sprite_1');
}
.c {
  background-image: url('images/C.png?__sprite=sprite_2');
}

.d {
  background-image: url('images/D.png?__sprite=sprite_2');
}
```

#### output.css

```css

.a {
  background-image: url('images/sprite_sprite_1.png');
}

.b {
  background-image: url('images/sprite_sprite_1.png');
}
.c {
  background-image: url('images/sprite_sprite_2.png');
}

.d {
  background-image: url('images/sprite_sprite_2.png');
}
```

配置中 `rootValue` 是控制当前模块全局的 `rem` 开关，如果想要指定某一处图片相关样式使用 `px` 或 `rem` 单位，可以在引用图片的地方通过参数指定，例如

```css
// 指定使用 `px` 单位
.a {
  background-image: url('images/A.png?__sprite=sprite_1&__px');
}

// 指定使用 `rem` 单位
.a {
  background-image: url('images/A.png?__sprite=sprite_1&__rem');
}

// 使用 `rem` 单位时同时指定自己的 `rootValue`
.a {
  background-image: url('images/A.png?__sprite=sprite_1&__rem=20');
}
```

配置中 `__widthHeight` 是控制关闭强制替换背景图width和height，例如

```css
// 强制使用 `__widthHeight` 来关闭width和height替换
.a {
  background-image: url('images/A.png?__sprite=sprite_1&__widthHeight');
  width:10px;
  height:10px;
}
```

## CONTRIBUTORS

[![luckyadam](https://avatars2.githubusercontent.com/u/1782542?v=3&s=120)](http://diao.li/) | [![Simba Chen](https://avatars2.githubusercontent.com/u/1519030?v=3&s=120)](https://github.com/Simbachen) | [![adamchuan](https://avatars0.githubusercontent.com/u/2565774?v=3&s=120)](https://github.com/adamchuan) | [![Sky Cai](https://avatars3.githubusercontent.com/u/3118988?v=3&s=120)](https://github.com/cnt1992) | [![Manjiz](https://avatars0.githubusercontent.com/u/13447336?v=3&s=120)](https://github.com/Manjiz) | [![panxinwu](https://avatars1.githubusercontent.com/u/1515508?v=3&s=120)](https://github.com/panxinwu) | [![Littly](https://avatars1.githubusercontent.com/u/5780093?v=3&s=120)](https://github.com/Littly)
:---:|:---:|:---:|:---:|:---:|:---:|:---:
[luckyadam](http://diao.li/) | [Simba Chen](https://github.com/Simbachen) | [adamchuan](https://github.com/adamchuan) | [Sky Cai](https://github.com/cnt1992) | [Manjiz](https://github.com/Manjiz) | [panxinwu](https://github.com/panxinwu) | [Littly](https://github.com/Littly)

## LICENCE

The MIT License (MIT)

Copyright (c) 2015

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
