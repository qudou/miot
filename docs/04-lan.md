# 内网网关

内网网关是连接网内配件与外网网关的桥梁，同时也是内网配件之间通信的媒介。

## 安装

如果你已经安装了 npm 客户端，可以通过 npm 安装局域网关程序 miot-local：

```bash
$ npm install miot-local
```

## 配置文件

内网网关项目中最关键的是下面两个文件：

```
miot-local/
├── miot-local.js            // 主文件
└── config.json              // 配置文件
```

主文件是启动文件，在此着重对配置文件做些说明，下面是配置文件的一个示例：

```js
// 04-01
{
    "proxy": {
        "port": 1883,                       // 若开启 tls，则使用 8443 端口
        "host": "localhost",                // 主机
        "clientId": "be1aa660-2b48-11ec-a191-4dbcbb23f97f", // 连接到外网网关的客户端标识符
        "protocol": "mqtt",                 // 若开启 tls，则使用 mqtts
        //"rejectUnauthorized": true,       // 开启授权
        //"ca": "dir/secure/tls-cert.pem"   // 自签名证书
    },
    "mosca": {
        "port": 1883,
        //"secure": { "port": 8443, "keyPath": "dir/secure/tls-key.pem",  "certPath": "dir/secure/tls-cert.pem" }
    },
    "parts": [
        { "id": "d9ae5656-9e5e-4991-b4e4-343897a11f28", "path": "/system" },
        { "id": "35e64bc0-1268-477a-9327-94e880e67866", "path": "/player" }
    ]
}
```

上面配置中，`proxy` 是连接到外网网关的配置，你可以根据需要来决定是否使用 lts 连接。`mosca` 是提供给内网配件连接的配置，你可以根据需要来决定是否开启 lts 安全连接。注意 `clientId` 必须已经在外网网关已经注册过的，否则连接将被拒绝。

上述的 `parts` 项是连接到内网网关的配件列表。配件描述中的参数 `id` 是配件的唯一标识符，网关只允许接入 `parts` 列表中存在的配件。参数 `path` 也用于唯一地命名配件，其描述方式类似于操作系统的文件定位。该参数存在的目的在于方便网内配件之间的访问控制。