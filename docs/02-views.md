# 视图

用户层落实到代码文件就是一个存放各用户界面的目录，为了便于陈述，这里再次引用前面章节中关于外网网关的项目结构图：

```
miot/
├── miot.js            // 主文件
├── config.json        // 配置文件
├── middle/            // 中间件目录
└── static/
    ├── views/         // 用户界面目录
    └── index.html     // 用户界面入口
```

注意到 miot/static/views/ 目录，该目录存放了各视图的代码文件，本章的目的就是弄清楚这个目录的来龙去脉，以及如果构建它们。

## 概述

视图是一个包含若干文件的文件夹，它的名称是已注册好的一个视图标识符。该文件夹包含一个名为 index.js 的主文件。下面是该文件的代码框架，其中顶层命名空间与包含目录名是一致的。组件 `Index` 是第一个被实例化的入口组件。最后的 `if` 语句是为了满足 require.js 规范而添加的。

```js
// 02-01
xmlplus(视图标识符, (xp, $_) => {

$_().imports({
    Index: {  // 入口
    }
});

});
if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}
```

此文件夹还可以包含一个可选的名为 icon.js 图标文件，同理，其中顶层命名空间与包含目录名是一致的。前端系统会将其显示为应用图标。如果图标文件未提供，系统则使用默认图标。下面是一个图标文件的示例：

```js
// 02-02
xmlplus(视图标识符, (xp, $_) => {

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

此文件夹中还可以包含图片或者其它资源文件，那么在主文件 index.js 是如何对其进行引用呢？请看下面的示例：

```js
// 02-03
$_().imports({
    Index: {
        xml: "<div id='index' class='page-content'>\
                <h3>请扫描二维码</h3>\
                <img id='img' src='/views/视图标识符/pic.jpg'/>\
              </div>\
    }
});
```

从上面的代码可见，主文件对相关资源的引用方式为 /views/视图标识符/资源名。当然也可以在主文件中交叉引用其它应用的资源，但不建议这么做。

## 初始化

作为第一个被实例化的入口组件，当 Index 的函数项被执行时，函数的参数 `opts` 包含了初始化数据 `name`，它是该应用的名称标识。你可以把该函数项理解为面向对象编程语言的类的构造函数。

```js
// 02-04
Index: {
    fun: function (sys, items, opts) {
        console.log(opts); // opts 含 name 选项
    }
}
```

在页面设计时，`name` 可以作为标题名置顶。当然，你也可以忽略它。

## 向中间件或者配件发送消息

向中间件或者配件发送消息，不需要明确指出具体的端，这是网关的工作。通过触发 `publish` 事件即可完成消息的发送。

```js
// 02-05
Index: {
    xml: "<button id='index'>submit</button>",
    fun: function (sys, items, opts) {
        this.on("click", () => {
            this.trigger("publish", ["/commit", {vol: 88}]);
        });
    }
}
```

如上述代码所描述的，发送的内容是一个数组，数组首位是一个用于标识数据主题的字符串。数组的次位是负载，可以为空或者是一个 `PlainObject` 类型的对象。如果没有负载，也可以忽略该实参，那么提交语句可以下面这样写：

```js
this.trigger("publish", "/commit");
```

## 接收来自中间件或者配件的消息

要接收来自中间件或者配件的消息，需要建立一个侦听目标主题的消息侦听器。如下面的示例所示：

```js
// 02-06
Index: {
    xml: "<button id='index'>submit</button>",
    fun: function (sys, items, opts) {
        this.watch("/receive", (e, data) => {
            console.log(data);
        });
    }
}
```

消息侦听器的第二个参数是自中间件或者配件发送的负载。注意，由于用户端与中间件或者配件之间的数据交互是建立在 MQTT 协议的 QoS 1 机制上的，所以在一些应用场合应该注意消息的重入问题。

最后，给出一个非强制性的消息格式的使用建议，所有的视图、中间件以及配件之间的通信消息主题统一以返斜杆 / 开头。比如，前面示例中的 `/commit` 和 `/receive`。