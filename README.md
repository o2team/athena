athena-html
===
[![npm version](https://badge.fury.io/js/athena-html.svg)](http://badge.fury.io/js/athena-html)
[![Code Climate](https://codeclimate.com/github/JDC-FD/athena-html/badges/gpa.svg)](https://codeclimate.com/github/JDC-FD/athena-html)
[![Dependency Status](https://david-dm.org/o2team/athena-html.svg)](https://david-dm.org/o2team/athena-html)

> JDC构建项目流程工具，可以生成相应目录和代码，同时对项目进行编译
> 一次安装，到处运行

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

目前已支持**sass/less**文件的编译，使用**sass**需要使用ruby安装**sass**和**compass**

```
$ [sudo] gem install sass
$ [sudo] gem install compass
```
由于墙的缘故（你懂的），原始的gen源[https://rubygems.org/](https://rubygems.org/)几乎无法使用，建议将gem源替换成淘宝的源

```
$ gem sources --add https://ruby.taobao.org/ --remove https://rubygems.org/
$ gem sources -l
*** CURRENT SOURCES ***

https://ruby.taobao.org
# 请确保只有 ruby.taobao.org
$ gem install rails
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

## 快速开始

基于命令 ``athena``，同时提供了简写``ath``

### 生成新项目

生成一个新的项目目录

```
$ ath app [项目名称]
```

或者使用简写 ``ath a [项目名称]``,``ath app -h``可以看到该命令的使用方式

然后根据提示一步一步来，将会自动生成项目的结构和所需文件代码，再也不用复制代码了哟~

### 新增模块

在某一项目中新增一个模块，比如在项目 **wd** 中新增一个 **open** 模块，需要在项目根目录下执行

```
$ ath module [模块名]
```

或者使用简写 ``ath m [模块名]``,``ath module -h``可以看到该命令的使用方式

然后根据提示一步一步来，将会自动生成项目的结构和所需文件代码，再也不用复制代码了哟~

### 新增页面

在某一模块下新增一个页面，**进入到该模块** 下，执行

```
$ ath page [页面名]
```

或者使用简写 ``ath pa [页面名]``,``ath page -h``可以看到该命令的使用方式

然后根据提示一步一步来，再也不用复制代码了哟~

### 新增widget

在某一模块下新增一个widget组件，**进入到该模块** 下，执行

```
$ ath widget [组件名]
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
$ athena build --module [模块名]
```

命令简写

```
$ ath b -m [模块名]
```

携带参数``--verbose``可以看到编译过程中的一些详细信息

携带参数``--pack``将进入打包模式，只输出静态稿到 **.temp** 目录下，如果只是制作静态稿，可以使用这种模式

携带参数``--remote``将根据输入的机器名来生成对应机器所需要的可上线文件，包括页面片，执行后所有可上线文件均在模块 **dist/output** 目录下，机器名和 **app-conf.js** 中配置的机器名一致

注意``--pack``和``--remote``不要同时使用

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

携带参数``--dist``将可以预览经过完整编译流程后生成的文件

**建议只serve当前正在修改的模块，因为只serve模块的话会快很多**

### athena deploy

在 **项目根目录下** 通过 ``athena deploy`` 会将整个项目重新编译，并且将编译好的文件部署到预览机器 *labs.qiang.it* 上去。我们需要更改 **app-conf.js** 的配置填写机器的用户名和密码。

``deploy`` 可简写成 ``d``。

通过传入参数来观察文件传输情况：

```
$ athena deploy --verbose
```
可以选择只发布一个模块的内容

如果觉得一次性部署整个项目太慢，可以选择进入到你想要部署的 **模块** 下来执行 ``athena deploy``

命令简写

```
$ ath d
```

### athena publish

``athena publish`` 会将模块重新编译后发布到开发机上，同时会将压缩并重命名后的css文件和动态生成的页面片文件发布到机器的对应目录下。而在每次执行 ``athena publish`` 后页面片中的时间戳将会自动更新。目前支持发布到腾讯和京东域的开发机，机器代号分别是 *tencent*
*jdTest*。在 ``athena publish`` 的过程中，你可以自行选择需要发布到开发机上的页面和对应静态资源。

``publish`` 可简写成 ``pu``。

在模块目录下执行这个命令将会只发布本模块的页面。

在项目根目录下执行，可以通过传参来决定将发布哪些模块。[模块名]参数指定模块，可以包含多个模块，多模块间使用 **,** 进行分隔

```
$ athena publish --module [模块名]
```
命令简写

```
$ ath pu -m [模块名]
```

### athena clone

进入到某一模块下，通过``athena clone`` 命令可以复制另一个模块的**widget**到当前模块。

```
$ athena clone --from [来源模块] --widget [widget名字]
```

## 部分功能使用方法

### px转rem

自动将`px`转成`rem`，需要配置`module-conf.js`里面的`support`属性如下即可：

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

将`background`或者`background-image`引用到的带有`?__sprite`后缀的图片进行**雪碧图合并**，同时支持是否开启`retina`，需要在配置文件`module-conf.js`的`support`增加下面属性：

```javascript
support : {  
    csssprite: {
      enable: true,
      retina: true  //是否支持retina
      rootvalue: 40
    }
  }
```

> 上面的属性`rootvalue`若设置为`0`表示不开启px转rem，若设置为非0正数，则表示`1rem=40px`，40为`rootvalue`的值。
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

## CONTRIBUTORS

[![luckyadam](https://avatars2.githubusercontent.com/u/1782542?v=3&s=120)](http://diao.li/) | [![Simba Chen](https://avatars2.githubusercontent.com/u/1519030?v=3&s=120)](https://github.com/Simbachen)| [![adamchuan](https://avatars0.githubusercontent.com/u/2565774?v=3&s=120)](https://github.com/adamchuan)
:---:|:---:|:---:
[luckyadam](http://diao.li/) | [Simba Chen](https://github.com/Simbachen) | [adamchuan](https://github.com/adamchuan)

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
