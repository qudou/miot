# 概述

miot 是一个基于 MQTT 协议的物联网平台框架。通过它，你可以快速地搭建属于你自己的物联网平台。通过下图，你可以大概地了解该平台的结构。

<img src="https://xmlplus.cn/img/miot/framework.png" class="img-responsive"/>

此平台分为四层，其主要名称和功能如下：

- 视图层 : 该层给用户提供操作界面
- 外网网关 : 外网网关连接内网网关并为用户层提供服务
- 内网网关 : 内网网关连接配件且与外网网关直接通信
- 配件层 : 配件通过内网网关组织起来，对外提供操作接口以及数据服务

此外，为了便于后面的叙述，下面对涉及平台相关的一些名词做出解释：

- 视图 : 视图层的组成单元，WEB 应用，通过 MQTT 协议与外网网关相联
- 配件 : 配件层的组成单元，终端应用，通过 MQTT 协议与内网网关相联
- 中间件 : 与视图及配件相匹配，含两个文件，一个为视图提供服务，另一个为配件提供服务
- 应用 : 由视图，中间件以及配件按 1:1:1 组成，其中任何一部分都是可选的

## 外网网关

如果你已经安装了 npm 客户端，可以通过 npm 安装服务程序 miot：

```bash
$ npm install miot
```

此服务程序即外网网关，同时它内置了视图服务以及中间件服务，下面给出的是项目的基本结构：

```
miot/
├── miot.js            // 主文件
├── config.json        // 配置文件
├── middle/            // 中间件目录
└── static/
    ├── views/         // 视图层目录
    └── index.html     // 视图层入口
```

这里仅对配置文件做些说明，对于其它内容，你只需要稍微了解就可以，当后面各章节会有详细的说明。

```json
{
    "proxy": {
        "port": 1888,
        "http": {"port": 8080, "static": "$dir/static", "bundle": true}
        // https: { port: 443, bundle: true, static: `$dir/static` }, secure: { keyPath: SECURE_KEY, certPath: SECURE_CERT } },
    },
    "mqtt_port": 8443
}
```

上面配置中，mqtt-port 是提供给内网网关连接的端口号，http_port 是提供给视图连接的端口号。

## 视图层与中间件

在上节给出的项目的基本结构中，视图层位于 /miot/static/views 目录中。其中，index.html 是主文件，旗下目录 views 存放了相关的视图目录。

在视图层主文件 index.html 的开头是外网网关的 MQTT 服务器的地址配置，你可以按需修改该内容：

```xml
<meta name="mqtt-server" content="ws://localhost:8080">
```

上面 content 中的 8080 即来自上节中配置文件的 http_port 值。当一切配置就绪后，即可使用如下命令启动项目：

```bash
$ node miot.js
```

项目启动后，用浏览器访问 index.html，使用初始用户名 admin 和密码 123456 即可登录后台进行配置管理。

与视图不同，中间件依附于外网网关，位于 /miot/middles/ 目录中，中间件由外网网关动态按需实例化。

## 内网网关

首先，安装内网网关服务程序 miot-local：

```bash
$ npm install miot-local
```

此服务程序包含了内网网关的相关文件，下面仅列出最要紧的两个文件：

```
miot-local/
├── miot-local.js            // 主文件
└── config.json              // 配置文件
```

相对于于外网网关，内网网关比较简单，在此着重对配置文件做些说明：

```json
{
    port: 1883,
    server: "mqtt://localhost:1883",
    client_id: "62cf572e-7c2a-4b87-96c6-a531cc5890ff",
    parts: [
        { "id": "d9ae5656-9e5e-4991-b4e4-343897a11f28", "path": "/system" }
    ]
}
```

下面是配置文件中各参数的含义：

- port : 提供给内网配件的连接端口
- server : 连接到的外网网关的服务地址
- client_id : 连接到外网网关的客户端标识符
- parts : 连接到内网网关的配件列表

上述配件描述中的 path 参数用于唯一地命名配件，其描述方式类似于操作系统的文件定位。当一切配置就绪后，即可使用如下命令启动网关服务：

```bash
$ node miot-local.js
```

## 配件层

任何支持 MQTT 客户端的软硬件平台都可以非常方便地建立配件以接入内网网关。下面仅以 Node.js 环境示例。首先安装 miot-part 模块。

```bash
$ npm install miot-part
```

下面一个是配件的示例，由此示例可知，配件想要连接进局域网关，最重要的是提供局域网关的地址以及当前配件标识符。

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

与中间件不同，配件是一个独立的终端应用程序，它通过 MQTT 协议与内网网关相联系。