# 配件

配件是一个包含了 MQTT 协议的客户端应用，任何支持 MQTT 协议的软硬件环境都可以接入配件。下面先以 Node.js 环境为例来说明如何编写配件应用。最后，再给出一个在 esp8266 上使用 lua 编程语言编写配件的示例。

## 安装与示例

首先需要安装 miot-part 模块：

```js
npm install miot-part
```

如下面示例所示，该模块封装了 MQTT 协议的客户端，配件应用在开发时只需要引入组件 `//miot-part/Client` 即可以方便使用。

```js
// 05-01
let xmlplus = require("miot-part");     // 模块引入
let config = {
    "port": 1883,                       // 若开启 tls，则使用 8443 端口
    "host": "localhost",
    "partId": "d9ae5656-9e5e-4991-b4e4-343897a11f28", // 连接到外网网关的客户端标识符
    "protocol": "mqtt",                 // 若开启 tls，则使用 mqtts
    //"rejectUnauthorized": true,       // 开启授权
    //"ca": "dir/secure/tls-cert.pem"   // 自签名证书
};

xmlplus("part-demo", (xp, $_) => {
$_().imports({
    Index: {
        cfg: { index: config },
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

同样，配件可以通过派发 `to-users` 事件向用户端发送消息。向用户端派发消息需要提供两个参数，如上面的示例，该配件向用户端派发了消息 `/hi/bob`，其中 `data` 是负载。下面是该 API 的格式：

```js
trigger("publish", [messageType, data]);
```

- `messageType` : `String` 消息名，比如 `/hi/bob`
- `data` : `AnyThing` 负载

向内网配件发送消息则需要派发 `to-parts` 事件，与 `to-users` 事件相比，该语句会多一个 `targets` 参数，该参数用于指明所接受的目标配件集合。

```js
trigger("to-parts", [targets, messageType, data]);
```

- `targets` : `String` 指明所接受的目标配件集合，如 `/:key`
- `messageType` : `String` 消息名，比如 `/hi/bob`
- `data` : `AnyTing` 负载

为了演示内网配件之间的通信，我们需要先来看下如何描述目标配件集。

## 目标配件集

目标配件集的写法类似于正则表达式，其描述的字符串由开源模块 `path-to-regexp` 来解析，下面是一些常用的目标配件表达式的通配符：

- 命名参数：由符号 `:` 加参数名来定义，如 `/:key`
- 可选后缀：由符号 `?` 紧跟参数定义，表示参数为可选，如 `/:key?`
- 零至多个：由符号 `*` 紧跟参数定义，表示允许参数为零个或多个，如 `/:key*`
- 一至多个：由符号 `+` 紧跟参数定义，表示允许参数为一个或多个，如 `/:key+`
- 自定义参数：可以是任何的合法的正则表达式的字符串表示，如 `/:key(\\w+)`
- 星号：星号 `*` 用于匹配一切子级路径，如 `/:key/*`

下面是一个向局域配件集发送消息的示例，该示例在接收到 `/close` 命令后，会向局域内所有的机器下达关闭命令。

```js
// 05-02
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

## 在 esp8266 上编写配件

下面的示例是用 lua 编程语言写的一个简易的配件，它连接内网网关，并向目标视图派发消息。

```lua
-- 05-03
partId = "d9ae5656-9e5e-4991-b4e4-343897a11f28"
m = mqtt.Client(partId,120)
m:on("connect",function(m)
	print("connection "..node.heap()) 
	m:subscribe(partId,0,function(m) print("sub done") end)
end )
m:on('offline', function(client) print('offline') end)
m:on('message', function(client, topic, data) 
    t = sjson.decode(data)
    message = {}
    message.pid = partId
    message.data = "hi,bob"
    message = sjson.encode(message)
    m:publish("to-gateway",message,1,1, function(client) print("sent") end)
end)
m:connect('192.168.0.1',1883,0,1)
```

如果要向内网配件派发消息，请添加如下语句，并把派发消息类型改为 "to-parts"。

```lua
message.targets = "/machine/*"
```