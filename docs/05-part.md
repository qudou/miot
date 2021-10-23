# 配件

配件是一个包含了 `MQTT` 客户端的应用，任何支持 `MQTT` 客户端的软硬件环境都可以接入配件。下面以 `Node.js` 环境为例来说明如何编写配件应用。

## 安装与示例

在 `Node.js` 环境下，首先需要安装 `miot-part` 模块：

```js
npm install miot-part
```

如下示例所示，该模块封装了 `MQTT` 客户端，配件应用在开发时只需要引入组件 `//miot-part/Client` 即可以方便使用。`Client` 组件需要两个参数，一个是局域网关，另一个是配件标识符。

```js
let xmlplus = require("miot-part");                // 模块引入
let server = "mqtt://localhost:1883";              // 局域网关
let pid = "d9ae5656-9e5e-4991-b4e4-343897a11f28";  // 配件标识符

xmlplus("part-demo", (xp, $_) => {

$_().imports({
    Index: {
        cfg: { index: { server: server, pid: pid } },
        xml: "<i:Client id='index' xmlns:i='//miot-part'/>",
        fun: function (sys, items, opts) {
            this.watch("/hi/alice", (e, body)=> {
                this.trigger("to-users", "/hi/bob");
            });
        }
    }
});

}).startup("//part-demo/Index");
```

配件可以接收来自用户端或者其它局域配件发来的消息，无论是哪一种，只需要在配件里面指定相应的侦听器即可。如上例所示，该侦听器侦听了名为 `/hi/alice` 的消息。

同样，配件可以通过派发 `to-users` 事件向用户端发送消息。向用户端派发消息需要提供两个参数，如上例所示，该配件向用户端派发了消息 `/hi/bob`，其中 `data` 是负载。下面是该 API 的格式：

```js
trigger("publish", [messageType, data]);
```

- `messageType` : `String` 消息名，比如 `/hi/bob`
- `data` : `AnyType` 负载

向局域网配件发送消息则需要派发 `to-parts` 事件，与 `to-users` 事件相比，该语句会多一个 `targets` 参数，该参数用于指明所接受的目标配件集合，该参数表达式的写法类似于正则表达式。

```js
trigger("to-parts", [targets, messageType, data]);
```

- `targets` : `String` 指明所接受的目标配件集合，如 `/:key`
- `messageType` : `String` 消息名，比如 `/hi/bob`
- `data` : `AnyType` 负载

## 目标配件集

上面提出的目标配件集的描述串由开源模块 `path-to-regexp` 来解析，下面是一些常用的目标配件表达式的通配符：

- 命名参数：由符号 `:` 加参数名来定义，如 `/:key`
- 可选后缀：由符号 `?` 紧跟参数定义，表示参数为可选，如 `/:key?`
- 零至多个：由符号 `*` 紧跟参数定义，表示允许参数为零个或多个，如 `/:key*`
- 一至多个：由符号 `+` 紧跟参数定义，表示允许参数为一个或多个，如 `/:key+`
- 自定义参数：可以是任何的合法的正则表达式的字符串表示，如 `/:key(\\w+)`
- 星号：星号 `*` 用于匹配一切子级路径，如 `/:key/*`

下面是一个向局域配件集发送消息的示例，该示例在接收到 `/close` 命令后，会向局域内所有的机器下达关闭命令。

```js
    Index: {
        cfg: { ... } },
        xml: "<i:Client id='index' xmlns:i='//miot-parts'/>",
        fun: function (sys, items, opts) {
            this.watch("/close", (e, body)=> {
                this.trigger("to-parts", ["/machine/*", "/close"]);
            });
        }
    }

```