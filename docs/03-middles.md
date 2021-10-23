# 中间件

与视图相对应，中间件也是一个包含若干文件的文件夹，它的名称与对应的视图的名称一致，是一个已注册好的视图标识符。

中间件也不是必须的。中间件按接收信息的来源，可以分为两个模块文件 `uindex.js` 和 `pindex.js`。

## 接收的信息来自视图

中间件模块 `uindex.js` 接收的信息来自视图，下面是该文件的代码框架，其中顶层命名空间与包含目录名是一致的，即视图标识符。

```js
// 03-01
xmlplus(视图标识符, (xp, $_) => {

$_().imports({
    Index: {
        fun: function (sys, items, opts) {
            this.watch("/from-user", (e, p) => console.log(p));
        }
    }
});
```

该模块接收的来自视图的信息是一个 `PlainObject` 对象，其包含内容如下：

```js
- `mid`: String 会话标识符
- `cid`: String 用户连接的客户端标识符
- `topic`: String 消息的主题
- `data`: AnyType 负载
```

模块完成数据处理后可以回传数据给视图，回传的数据和来源内容不必相同，但必须包含 `mid`、`topic` 以及 `data` 3 个字段且 `mid` 字段必须与来源的内容一致。

```js
// 03-02
Index: {
    fun: function (sys, items, opts) {
        this.watch("/from-user", (e, p) => {
            this.trigger("to-users", {mid: p.mid, topic: "/hi", data: "Alice"});
        });
    }
}
```

虽然数据请求来源于一个试图，但同时在线使用该中间件服务的视图可以有多个，所以上面事例中出现的事件名采用的是复数形式: `to-users`。

如果只想回复发送消息的视图，在回复信息中可以加入 `cid` 字段。否则，回复的信息会发送给正在使用该中间件的视图。

模块完成数据处理后也可以发送数据给配件端，发送的数据和来源内容不必相同，但必须包含下面所述的 3 个字段且 `mid` 字段必须与来源的内容一致。

```js
- `mid`: String 会话标识符
- `topic`: String 消息的主题
- `body`: AnyType 负载
```

下面的示例演示了如何从视图接收数据以及如何向配件端发送数据。

```js
// 03-03
Index: {
    fun: function (sys, items, opts) {
        this.watch("/from-user", (e, p) => {
            this.trigger("to-local", {mid: p.mid, topic: "/hi", body: "Bob"});
        });
    }
}
```

这里解释下为什么将发送给配件端的事件命名为 `to-local`，而不是 `to-part`。因为与外网网关直连的是内网网关而不是配件。

如果文件 uindex.js 不存在，那么系统会试图将消息直接发送给配件端。

## 接收的数据来自配件端

中间件模块 `pindex.js` 接收的信息来自配件端，下面是该文件的代码框架，其中顶层命名空间与包含目录名是一致的，即试图标识符。

```js
// 03-04
xmlplus(试图标识符, (xp, $_) => {

$_().imports({
    Index: {
        fun: function (sys, items, opts) {
            this.watch("/from-part", (e, p) => console.log(p));
        }
    }
});
```

该模块接收的来自配件端的信息信息是一个 PlainObject 对象，其包含内容如下：

```js
- `mid`: String 会话标识符
- `topic`: String 消息的主题
- `data`: AnyType 负载
```

模块完成数据处理后可以将数据回传给配件端，回传的数据和来源内容不必相同，但必须包含下面的 3 个字段且 `mid` 字段必须与来源的内容一致。

```js
- `mid`: String 会话标识符
- `topic`: String 消息的主题
- `body`: AnyType 负载
```

下面的示例演示了如何从配件端接收数据然后再回传给配件端。

```js
// 03-05
Index: {
    fun: function (sys, items, opts) {
        this.watch("/from-part", (e, p) => {
            this.trigger("to-part", {mid: p.mid, topic: "/hi", body: "Alice"});
        });
    }
}
```

模块完成数据处理后也可以发送给视图。发送的数据和来源内容不必相同，但必须包含下面的 3 个字段且 `mid` 字段必须与来源的内容一致。

```js
- `mid`: String 会话标识符
- `topic`: String 消息的主题
- `data`: AnyType 负载
```

下面的示例演示了如何从配件端接收数据以及如何向视图发送数据。

```js
// 03-06
Index: {
    fun: function (sys, items, opts) {
        this.watch("/from-part", (e, p) => {
            this.trigger("to-users", {mid: p.mid, topic: "/hi", body: "Bob"});
        });
    }
}
```

与来源于视图的消息不同，来源于配件的消息不含 cid 字段。所以，当来自配件的消息要发往视图，任何被授权的在线用户都可以接收到该消息。