# 概述

miot 是一个基于 MQTT 协议的物联网平台框架。通过它，你可以快速地搭建属于你自己的物联网平台。通过下图，你可以大概地了解该平台的结构。

<img src="https://xmlplus.cn/img/miot-framework.png" class="img-responsive"/>

此平台分为四层，其主要名称和功能如下：

- 用户层 : 该层给用户提供操作界面
- 外网网关 : 外网网关连接内网网关并为用户层提供服务
- 内网网关 : 内网网关连接配件且与外网网关直接通信
- 配件层 : 配件通过内网网关组织起来，对外提供操作接口以及数据服务

## 外网网关与用户界面

如果你已经安装了 npm 客户端，可以通过 npm 安装服务程序 miot：

```bash
$ npm install miot
```

或者，你也可以通过 git 和 npm 使用如下的命令来安装：

```bash
$ git clone https://github.com/qudou/miot.git && cd miot && npm install
```

此服务程序包含了用户界面与外网网关的相关文件，下面给出的是项目的基本组织结构：

```
miot/
├── miot.js            // 主文件
├── config.json        // 配置文件
├── middle/            // 中间件目录
└── static/
    ├── parts/         // 用户界面目录
    └── index.html     // 用户界面入口
```

这里仅对配置文件做些说明，对于其它内容，你只需要稍微了解就可以，当后面讲到配件的编写时会有详细的说明。

```json
{
    "mqtt_port": 1883, // 提供给内网网关连接的端口号
    "http_port": 8080  // 提供给用户界面连接的端口号
}
```

在用户界面主文件 `index.html` 的开头是连接到外网网关的配置，你可以按需修改该内容：

```xml
<meta name="mqtt-server" content="ws://localhost:8080">
```

上面 `content` 中的 `8080` 即来自配置文件中的 `http_port` 值。

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
    port: 1883,                                                             // 提供给内网配件的连接端口
    server: "mqtt://localhost:1883",                                        // 连接到的外网网关的服务地址
    client_id: "62cf572e-7c2a-4b87-96c6-a531cc5890ff",                      // 连接到外网网关的客户端标识符
    parts: [
        { "id": "d9ae5656-9e5e-4991-b4e4-343897a11f28", "path": "/system" },// 连接到内网网关的配件描述
        { "id": "35e64bc0-1268-477a-9327-94e880e67866", "path": "/player" } // 连接到内网网关的配件描述
    ]
}
```

配件描述中的 `path` 参数的描述方式类似于操作系统的文件定位，请确保网内各配件的该参数值互不相同。

## 配件层

任何支持 MQTT 客户端的软硬件平台都可以非常方便地建立配件以接入内网网关。下面仅以 Node.js 环境示例。首先安装 miot-part 模块。

```bash
$ npm install miot-part
```

下面引入的是 [配件](/miot#配件) 章节中的例子，详情可以参阅原文。

```js
let xmlplus = require("miot-part");                // 模块引入
let server = "mqtt://localhost:1883";              // 局域网关
let pid = "d9ae5656-9e5e-4991-b4e4-343897a11f28";  // 配件标识符

xmlplus("miot-part", (xp, $_) => {

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

}).startup("//miot-part/Index");
```

从此示例可以看出，配件想要连接进局域网关，最重要的是提供网关的地址以及在网关中配置过的配件标识符。非网关配置的配件将被拒绝接入。