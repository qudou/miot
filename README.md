# miot

一个基于 MQTT 设计的物联网平台，通过它，你可以快速地搭建属于你自己的物联网平台。

<img src="https://xmlplus.cn/img/miot-framework.png" class="img-responsive"/>

此平台分为四层，其主要名称和功能如下：

- 用户层 : 该层给用户提供操作界面
- 外网网关 : 外网网关连接内网网关并为用户层提供服务
- 内网网关 : 内网网关连接配件且与外网网关直接通信
- 配件层 : 配件通过内网网关组织起来，对外提供操作接口以及数据服务

想了解更多，请访问 [miot](https://xmlplus.cn/miot)