# 中间件

与视图相对应，中间件也是一个包含若干文件的文件夹，它的名称与对应的用户端的名称一致，是一个已注册好的模板标识符。

中间件也不是必须的。中间件按接收信息的来源，可以分为两个模块文件 `uindex.js` 和 `pindex.js`。

## 接收的信息来自视图

中间件模块 `uindex.js` 接收的信息来自视图，下面是该文件的代码框架，其中顶层命名空间与包含目录名是一致的，即模板标识符。

```js
// 02-01
xmlplus(模板标识符, (xp, $_) => {

$_().imports({
    Index: {
        fun: function (sys, items, opts) {
            this.watch("/from-user", (e, p) => console.log(p));
        }
    }
});
```

该模块接收的来自用户端的信息是一个 `PlainObject` 对象，其包含内容如下：

```js
- `mid`: String 会话标识符
- `cid`: String 用户连接的客户端标识符
- `topic`: String 消息的主题
- `data`: AnyType 负载
```

模块完成数据处理后可以回传数据给用户端，回传的数据和来源内容不必相同，但必须包含 `mid`、`topic` 以及 `data` 3 个字段且 `mid` 字段必须与来源的内容一致。

```js
// 02-02
Index: {
    fun: function (sys, items, opts) {
        this.watch("/from-user", (e, p) => {
            this.trigger("to-users", {mid: p.mid, topic: "/hi", data: "Alice"});
        });
    }
}
```

虽然数据请求来源于一个用户端，但同时在线使用该中间件服务的用户端可以有多个，所以上面事例中出现的事件名采用的是复数形式: `to-users`。

如果只想回复发送消息的用户端，在回复信息中可以加入 `cid` 字段。否则，回复的信息会发送给所有使用了该中间件的用户端。

模块完成数据处理后也可以发送数据给配件端，发送的数据和来源内容不必相同，但必须包含下面所述的 3 个字段且 `mid` 字段必须与来源的内容一致。

```js
- `mid`: String 会话标识符
- `topic`: String 消息的主题
- `body`: AnyType 负载
```

下面的示例演示了如何从用户端接收数据以及如何向配件端发送数据。

```js
// 02-03
Index: {
    fun: function (sys, items, opts) {
        this.watch("/from-user", (e, p) => {
            this.trigger("to-local", {mid: p.mid, topic: "/hi", body: "Bob"});
        });
    }
}
```

这里解释下为什么将发送给配件端的事件命名为 `to-local`，而不是 `to-part`。因为与外网网关直连的实际上是内网网关。

## 接收的数据来自配件端

中间件模块 `pindex.js` 接收的信息来自配件端，下面是该文件的代码框架，其中顶层命名空间与包含目录名是一致的，即模板标识符。

```js
// 02-04
xmlplus(模板标识符, (xp, $_) => {

$_().imports({
    Index: {
        fun: function (sys, items, opts) {
            this.watch("/from-part", (e, p) => console.log(p));
        }
    }
});
```

该模块接收的来自配件端的信息信息是一个 `PlainObject` 对象，其包含内容如下：

```js
- `mid`: String 会话标识符
- `topic`: String 消息的主题
- `body`: AnyType 负载
```

模块完成数据处理后可以将数据回传给配件端，回传的数据和来源内容不必相同，但必须包含上面所述的 3 个字段且 `mid` 字段必须与来源的内容一致。

```js
// 02-05
Index: {
    fun: function (sys, items, opts) {
        this.watch("/from-part", (e, p) => {
            this.trigger("to-part", {mid: p.mid, topic: "/hi", data: "Alice"});
        });
    }
}
```

模块完成数据处理后也可以发送给用户端。发送的数据和来源内容不必相同，但必须包含下面的 3 个字段且 `mid` 字段必须与来源的内容一致。

```js
- `mid`: String 会话标识符
- `topic`: String 消息的主题
- `data`: AnyType 负载
```

下面的示例演示了如何从配件端接收数据以及如何向用户端发送数据。

```js
// 02-06
Index: {
    fun: function (sys, items, opts) {
        this.watch("/from-part", (e, p) => {
            this.trigger("to-users", {mid: p.mid, topic: "/hi", body: "Bob"});
        });
    }
}
```