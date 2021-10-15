# 用户层

用户层落实到代码文件就是一个存放各用户界面的目录，为了便于陈述，这里再次引用上一章节中关于外网网关的项目结构图：

```
miot/
├── miot.js            // 主文件
├── config.json        // 配置文件
├── middle/            // 中间件目录
└── static/
    ├── views/         // 用户界面目录
    └── index.html     // 用户界面入口
```

注意到 miot/static/views/ 目录，该目录存放了各用户界面的代码文件，本章的目的就是弄清楚这个目录的来龙去脉，以及如果编写用户界面。

## 概述

用户端是一个包含若干文件的文件夹，它的名称是已注册好的一个模板标识符。

该文件夹包含一个必需的名为 `index.js` 的主文件。下面是该文件的代码框架，其中顶层命名空间与包含目录名是一致的。组件 `Index` 是第一个被实例化的入口组件。最后的 `if` 语句是为了满足 `require.js` 规范而添加的。

```js
// 01-01
xmlplus(模板标识符, (xp, $_) => {

$_().imports({
    Index: {
        // 入口
    }
});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}
```

此文件夹还可以包含一个可选的名为 `icon.js` 图标文件，同理，其中顶层命名空间与包含目录名是一致的。前端系统会将其显示为应用图标。如果图标文件未提供，系统则会使用默认图标。下面是一个图标文件的主体内容：

```js
// 01-02
xmlplus(模板标识符, (xp, $_) => {

$_().imports({
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M864.4 831.1V191.7c0-35.3...'/>\
                <path d='M161.1 383.5h703.3v63.9H1...'/>\
              </svg>"
    }
});

});
```

此文件夹中还可以包含图片或者其它资源文件，那么在主文件 `index.js` 该如何对其引用呢？请看下面的示例：

```js
// 01-03
$_().imports({
    Index: {
        xml: "<div id='ip' class='page-content'>\
                <h3>请扫描二维码</h3>\
                <img id='img' src='/parts/模板标识符/pic.jpg'/>\
              </div>\
    }
});
```

从上面的代码可见，主文件对相关资源的引用方式为 `/parts/模板标识符/资源名`。当然也可以在主文件中引用其它应用的资源，但不建议这么做。

## 初始化

作为第一个被实例化的入口组件，当 `Index` 的函数项被执行时，函数的参数 `opts` 包含了初始化数据：`name`。其中，它是该应用的名称标识。你可以把该函数项理解为面向对象编程语言的类的构造函数。

```js
// 01-04
Index: {
    fun: function (sys, items, opts) {
        // 含 name 和 data 两个选项
        console.log(opts);
    }
}
```

在页面设计时，`name` 可以作为标题名置顶。当然，你也可以忽略它。

## 与中间件或者配件间的数据交互

向中间件或者配件提交数据，不需要明确指出具体的端，这是中间件或者配件的工作。通过触发 `publish` 事件即完成数据的提交。

```js
// 01-05
Index: {
    xml: "<button id='index'>submit</button>",
    fun: function (sys, items, opts) {
        this.on("click", () => {
            this.trigger("publish", ["/payload", {vol: 88}]);
        });
    }
}
```

如上述代码所描述的，提交的数据是一个数组，数组首位是一个用于标识数据主题的字符串。数组的次位可以为空或者是一个 `PlainObject` 类型的对象。

上面说的是向中间件或者配件提交数据，现在来看下如何接收中间件或者配件端的数据。请看下面的示例，接收数据只需建立一个侦听目标主题的消息侦听器。

```js
// 01-06
Index: {
    xml: "<button id='index'>submit</button>",
    fun: function (sys, items, opts) {
        this.watch("/payload", (e, data) => {
            console.log(data);
        });
    }
}
```

注意，由于用户端与中间件以及配件间的数据交互是建立在 `MQTT` 协议的 `QoS 1` 机制上的，所以在一些应用场合应该注意消息的重入问题。