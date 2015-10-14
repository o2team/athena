athena-html
===
[![npm version](https://badge.fury.io/js/athena-html.svg)](http://badge.fury.io/js/athena-html)
[![Code Climate](https://codeclimate.com/github/JDC-FD/athena-html/badges/gpa.svg)](https://codeclimate.com/github/JDC-FD/athena-html)
[![Dependency Status](https://david-dm.org/JDC-FD/athena-html.svg)](https://david-dm.org/JDC-FD/athena-html)

> JDC构建项目流程工具，可以生成相应目录和代码，同时对项目进行编译

> 一次安装，到处运行

## 安装

基于``node``，请确保已具备较新的node环境

安装本项目 **athena-html**

```
[sudo] npm install -g athena-html
```

由于国外源实在太慢，建议使用国内源来安装

```
[sudo] npm i -g athena-html —registry=http://registry.npm.taobao.org —disturl=http://npm.taobao.org/mirrors/node
```

## 项目结构

一个项目对应一个目录，项目中可以包含多个模块，项目将由以下结构组成


    ├── module1                 - 模块1
    ├── module2                 - 模块2
    ├── module3                 - 模块3
    └── app-conf.js             - 项目的配置信息

项目中模块将由以下结构组成

    ├── dist                    - 通过编译生成的目录
    │   ├── combofile           - publish时用来存放生成页面和页面片文件的目录
    │   ├── css                 - 通过编译生成的css文件
    │   ├── js                  - 通过编译生成的js文件
    │   ├── image               - 通过编译压缩后的image文件
    │   ├── page1.html          - 通过编译生成的页面html
    │   ├── map.json            - 通过gulp编译后生成页面依赖widget列表
    |
    ├── page                    - 所有页面目录
    │   ├── page                - 某一页面目录
    │       ├── page.css        - 页面级css
    │       ├── page.js         - 页面级js
    │       ├── page.html       - 页面html
    │
    ├── static
    │   ├── css                 - 额外的css文件
    │   ├── js                  - 额外的js文件
    │   ├── image               - 额外的image文件
    │  
    ├── widget                  - 所有widget目录
    │   ├── widget              - 某一widget目录
    │       ├── image           - widget的图片目录
    │       ├── widget.css      - widget的css
    │       ├── widget.js       - widget的js
    │       ├── widget.html     - widget的html
    │
    ├── static-conf.js          - 需要额外引用的静态资源的配置
    │
    └── module-conf.js          - 模块的配置信息

在这种项目组织方式中，将页面拆分成各个widget组件，在页面中通过加载各个widget的方式来拼装页面，再经过gulp编译，生成正常页面。

## 快速开始

基于命令 ``athena``，同时提供了简写``ath``

### 生成新项目

生成一个新的项目目录

```
ath app [项目名称]
```

或者使用简写 ``ath a [项目名称]``,``ath app -h``可以看到该命令的使用方式

然后根据提示一步一步来，将会自动生成项目的结构和所需文件代码，再也不用复制代码了哟~

### 新增模块

在某一项目中新增一个模块，比如在项目 **wd** 中新增一个 **open** 模块，需要在项目根目录下执行

```
ath module [模块名]
```

或者使用简写 ``ath m [模块名]``,``ath module -h``可以看到该命令的使用方式

然后根据提示一步一步来，将会自动生成项目的结构和所需文件代码，再也不用复制代码了哟~

### 新增页面

在某一模块下新增一个页面，**进入到该模块** 下，执行

```
ath page [页面名]
```

或者使用简写 ``ath pa [页面名]``,``ath page -h``可以看到该命令的使用方式

然后根据提示一步一步来，再也不用复制代码了哟~

### 新增widget

在某一模块下新增一个widget组件，**进入到该模块** 下，执行

```
ath widget [组件名]
```

或者使用简写 ``ath w [组件名]``,``ath widget -h``可以看到该命令的使用方式

然后根据提示一步一步来，再也不用复制代码了哟~

## 使用及编译

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

#### getCSS

使用方式 `<%= getCSS() %>`

用来输出页面所需引用的**CSS Link**，可传入2个参数，第一个参数是`CSS` 样式表的名称，第二个参数是模块名。如果什么都不传则默认输出与当前页面同名的样式表。例如：

当前模块`hello`中有一页面为`mine.html`，在页面`<head>`标签中调用`<%= getCSS() %>`将输出

```
<link rel="stylesheet" type="text/css" href="css/mine.css" combo-use="/hello/css/mine.min.css">
```

#### getJS

与上述`getCSS`相似，将输出页面所需引用的脚本文件，参数与`getCSS`保持一致。

当前模块`hello`中有一页面为`mine.html`，在页面`<body>`标签最后调用`<%= getJS() %>`将输出

```
<script src="js/hello.js"></script>
```


**注意**

* 这些API调用语句末尾不要加分号

### app-conf.js

在**项目**的根目录下生成的文件中，**app-conf.js** 文件是一个通过传入配置项生成的关于本项目的配置文件，我们可以看到它包含如下配置：

```javascript

'use strict';

module.exports = {
  app: 'qwd', // 项目名称
  common: 'gb', // 公共模块
  moduleList: ['gb', 'frs', 'test'], // 项目下模块列表，通过athena module命令生成模块时会自动往此处添加新模块名
  deploy: {  // 需要发布时的配置
    qiang: {
      host: 'labs.qiang.it', // 机器host
      user: '', // 用户名
      pass: '', // 密码
      port: 21, // 端口
      remotePath: '/labs.qiang.it/h5/qwd/frs' // 上传到的目录
    },
    jdTest: {
      host: '192.168.193.32',
      user: '',
      pass: '',
      port: 22,
      fdPath: '/fd/h5',
      domain: 's.paipaiimg.com',
      remotePath: '/export/paipai/resource/static/fd/h5/hellokity',
      cssi: '/export/paipai/resource/sinclude/cssi/fd/h5/hellokity', // 上传页面片的目录
      assestPrefix: '/static/fd/h5/hellokity', // 发布完静态资源后，静态资源路径
      shtmlPrefix: '/sinclude/cssi/fd/h5/hellokity' // 发布完页面片后，静态资源路径
    },
    tencent: {
      host: '172.25.34.21',
      user: '',
      pass: '',
      port: 21,
      fdPath: '/fd/h5',
      domain: 'static.paipaiimg.com',
      remotePath: '/newforward/static/fd/h5/hellokity',
      cssi: '/newforward/static/sinclude/cssi/fd/h5/hellokity',
      assestPrefix: '/static/fd/h5/hellokity',
      shtmlPrefix: '/static/sinclude/cssi/fd/h5/hellokity'
    }
  }
};

```
其中 **app**、**common** 配置项 **不要** 修改，我们需要重点关注 **deploy** 这个配置项，这是发布到一些机器上的配置，可以注意到用户名和密码是空的，我们需要自己去完善它，同时上传的目录可以根据自己的需要进行修改。

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
    px2rem: {  // px转rem配置
      enable: false,  // 是否开启
      root_value: 40,
      unit_precision: 5,
      prop_white_list: [],
      selector_black_list: [],
      replace: true,
      media_query: false
    },
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

**map.json** 文件是通过执行gulp任务后生成一个标识依赖关系的文件，文件中包含了当前模块所有页面所依赖的**widget**组件的信息，同时还有页面引用静态资源的信息，它的文件结构如下

```javascript
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

同时你可以通过传入参数来决定你需要编译的模块，[模块名]参数指定模块，可以包含多个模块，多模块间使用 **,** 进行分隔

```
athena build --module [模块名]
```

命令简写

```
ath b -m [模块名]
```
使用``ath b -h`` 查看帮助。

### athena serve

通过``athena serve``命令可以实时预览正在编辑的页面。你可以在根目录执行这个命令，也可以进入到具体模块目录下去执行这个命令。

``serve`` 可简写成 ``s``。

如果在项目根目录下，可以通过携带参数来决定要浏览的页面：
```
athena serve --module [模块名] --page [页面名]
```

如果在模块目录下，可以通过携带参数来决定要浏览的页面：
```
athena serve --page [页面名]
```
命令简写

```
ath s -m [模块名] --page [页面名]
```

### athena deploy

在 **项目根目录下** 通过 ``athena deploy`` 会将整个项目重新编译，并且将编译好的文件部署到预览机器 *labs.qiang.it* 上去。我们需要更改 **app-conf.js** 的配置填写机器的用户名和密码。

``deploy`` 可简写成 ``d``。

通过传入参数来观察文件传输情况：

```
athena deploy --verbose
```
可以选择只发布一个模块的内容

如果觉得一次性部署整个项目太慢，可以选择进入到你想要部署的 **模块** 下来执行 ``athena deploy``

命令简写

```
ath d
```

### athena publish

``athena publish`` 会将模块重新编译后发布到开发机上，同时会将压缩并重命名后的css文件和动态生成的页面片文件发布到机器的对应目录下。而在每次执行 ``gulp publish`` 后页面片中的时间戳将会自动更新。目前支持发布到腾讯和京东域的开发机，机器代号分别是 *tencent*
*jsTest*。在 ``athena publish`` 的过程中，你可以自行选择需要发布到开发机上的页面和对应静态资源。

``publish`` 可简写成 ``pu``。

在模块目录下执行这个命令将会只发布本模块的页面。

在项目根目录下执行，可以通过传参来决定将发布哪些模块。[模块名]参数指定模块，可以包含多个模块，多模块间使用 **,** 进行分隔

```
athena publish --module [模块名]
```
命令简写

```
ath pu -m [模块名]
```

### athena clone

进入到某一模块下，通过``athena clone`` 命令可以复制另一个模块的**widget**到当前模块。

```
athena clone --from [来源模块] --widget [widget名字]
```
