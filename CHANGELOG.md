# ChangeLog

## 1.0.10

* update:新增 `ath map` 命令，列出组件依赖关系
* fix:client模式打包时图片地址错误😨

## 1.0.9

* update:修改上传文件过滤的逻辑，通过实时文件md5值来判断，增加--all选项来上传所有页面
* fix:client模式打包时引用公共组件，静态资源路径出错
* update:模板抽离功能
* update:页面片增加页面片地址注释

## 1.0.8

* update:增强地址替换时的检测规则
* update:修改资源合并逻辑，client模式不需要在gb.html中调用公共组件即可使用

## 1.0.7

* fix:sass编译时误把纯css文件缓存起来
* update:widget.loadFloor方法增加对script的处理
* update:cms楼层最后处理的时候增加组件编译和地址替换的操作
* update:支持smarty模板
* update:增加是否打开浏览器选项，ath s --silence

## 1.0.6

* fix:兼容之前项目不存config.rb文件的问题
* fix:static目录下多级目录中的静态资源文件不压缩
* fix:server模式下当组件或页面的css、js不存在时，不加入url
* update:兼容Node 6.x

## 1.0.5

* update:client模式编译增加--release，可以通过comboConf配置线上地址
* fix:修复资源url中带有?#&时查找出错的情况
* update:优化CSSLint检查，检查结果输出到模块的csslint_error.html文件中
* fix:sass中import引入，对引入importsass文件修改，不能实时编译，要清除缓存才行
* update:优化sass编译

## 1.0.4

* update:优化client模式编译步骤，合并重复操作
* fix:清除发布缓存不传参数无法删除缓存
* fix:远程加载组件回传参数
* fix:上传后列表中图片地址，多级目录被展开，同时过滤列表中html文件
* update:combo-use标记增加总控制
* update:优化serve时文件修改反馈
* update:模板中文别名，提高模板辨识度

## 1.0.3

* update:增加加载远程组件功能
* fix:生成页面片时，允许添加引用线上样式

## 1.0.2

* update:优化ugliyfyjs的报错信息
* update:清除发布缓存时增加机器名参数
* fix:修复文件不加md5时图片不上传的bug
* update:上传压缩代码包中排除psd文件
* fix:修复不使用文件md5时发布过滤失败的bug
* fix:处理CMS楼层模板，增加$portal_floor_id定义的代码
* update:优化csslint，csslint失败不中断编译
* fix:修复png图片替换后编译依然是原图的问题

## 1.0.1

* update:优化serve时文件watch的功能
* update:新版本更新提醒功能
* update:配合CMS后台的开发解决方案

## 1.0.0

* update:未发布过公共模块时不给于错误提示
* update:添加开发指引
* fix:修复低版本node不支持Object.assign以及在模块中发布时报错的问题
* 添加关键代码的注释
* update:文件md5可配置
* fix:修复预览时二维码url的bug
* fix:将compass合成图片目录放到自己模块的static/images目录下

## 1.0.0-rc.10

* update:调整打MD5戳步骤
* update:将sass和图片编译缓存存放至用户的.athena目录，每次编译后删除dist缓存
* update:app-conf中增加versionControl配置，用于标记项目使用的版本控制
* update:新增删除sass编译和图片压缩缓存选项
* update:sass目录内的单个文件引用不需要配置
* update:编译稍稍提速
* update:由于管理平台机器太慢，将上传超时延长
* fix:server编译模式下当引用不存在的组件时静态资源链接拼接错误

## 1.0.0-rc.9

* fix:修复预览问题
* update:支持只编译一个页面
* update:调整编译步骤

## 1.0.0-rc.8

* fix:修复上一版本的发布出错问题
* fix:完善生成html页面片生成功能
* update:client编译模式文件md5，先给图片资源加，再给静态文件加

## 1.0.0-rc.7

* fix:修复某些node版本下png图片压缩包报错的问题
* fix:修复server合并模式下引用网络资源的url编译错误问题
* update:增加自定义某些组件生成html页面片的功能，通过配置app-conf.js实现
* update:输出widget标识信息

## 1.0.0-rc.6

* update:模板语法出错时，告知出错文件
* update:增加文件合并放到服务端的编译模式，通过配置app-conf.js实现
* update:文件编译到.temp目录后增加了一层当前模块名的目录

## 1.0.0-rc.5

* update:增加athena update命令用于检测并更新athena包
* update:进行编译时会去请求存储在管理平台的公共模块的map.json，以此为标准，这样子发布时不需要再重新编译发布公共模块
* update:发布公共模块时给予相应提示，要求检查公共模块代码是否最新
* update:页面片增加设置时间戳选项

## 1.0.0-rc.4

* fix:修复发布时不带参数报错的问题
* fix:修复页面片占位被干掉的问题
* fix:复制组件时当组件不存在时给予提示

## 1.0.0-rc.3

* update:强化打包功能，增加引用压缩静态资源打包方式，同时将代码压缩成zip包
* update:发布功能增加携带remote参数指定机器名，以避免重复选择发布机器

## 1.0.0-rc.2

* fix:修复页面片需要合并时页面URL出错的问题
* fix:修复windows下编译文件路径的问题
* fix:修复windows下文件上传过滤的bug
* update:站点地图通过扫描各个模块下页面来生成
* update:当请求模板错误且本地没有缓存模板时使用默认模板

## 1.0.0-rc.1

* update:编译提速，增加图片压缩时的缓存
* update:编译提速，增加编译时的sass缓存

## 0.0.39

* 生成项目、模块、页面、组件文件结构
* 轻量组件化功能
* 根据组件加载情况生成资源依赖表
* 页面、组件html编译
* Sass/less 编译
* csslint/jshint 代码检查
* CSS合并压缩
* CSS prefix，px转rem
* JS合并压缩
* 自动生成雪碧图，自动多倍图
* 图片压缩
* 字体压缩
* 文件MD5戳
* 本地预览
* 资源定位（图片等资源路径替换）
* 生成CSS页面片
* 部署到预览机和开发机
