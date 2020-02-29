# miot

一个基于 MQTT 设计的物联网平台

## 从配件端到用户端的通信 (与现有代码不一致，要修改代码)

1. 配件端将 `(pid,topic,data)` 发送给服务端

2. 服务端根据 `(part = pid, link = client.id)` 在表 `parts` 中查出唯一的 `mid` 记录

3. 服务端在授权表 `auths` 中根据 `mid` 查出已授权的用户 `id` 列表

4. 服务端根据用户 `id` 列表，在状态表 `status` 中查找在线的用户端的 `client.id` 列表

5. 服务端将 `(mid,topic,data)` 发送给已查询出的用户端

## 从用户端到配件端的通信

1. 用户端将 `(mid,topic,body)` 发送给服务端

2. 服务端根据 `mid` 在表 `parts` 中查出唯一的 `mid` 记录

3. 服务端提取 `link = client.id` 和 `part = pid`

4. 服务端根据已经查到的 `client.id` 将 `(pid,topic,data)` 发送给局域网关 `proxy`

5. 局域网关 `proxy` 转发 `(pid,topic,data)` 给 `mosca`

6. `mosca` 以 `pid` 为 `topic`, 发送 `(topic, data)` 给目标配件