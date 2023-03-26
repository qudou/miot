/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("d9c69375-2edc-43d3-a2a4-7bd93c31eb4f", (xp, $_) => { // 用户管理

$_().imports({
    Index: {
        css: "#stack { width: 100%; height: 100%; }",
        xml: "<i:Applet xmlns:i='//xp'>\
                <i:ViewStack id='stack'>\
                  <Overview id='overview'/>\
                  <Signup id='signup'/>\
                  <Update id='update'/>\
                  <Chpasswd id='chpasswd'/>\
                </i:ViewStack>\
                <Preload id='mask' xmlns='//xp/preload'/>\
              </i:Applet>",
        fun: function (sys, items, opts) {
            sys.stack.on("/mask/show", (e) => {
                e.stopPropagation();
                items.mask.show();
            });
            sys.stack.on("/mask/hide", (e) => {
                e.stopPropagation();
                items.mask.hide();
            });
            this.trigger("publish", "/users/select");
        }
    },
    Overview: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' title='用户管理' menu='注册'/>\
                <Content xmlns='overview'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.navbar.on("iconClick", e => this.trigger("close"));
            sys.navbar.on("menuClick", () => this.trigger("goto", "signup"));
        }
    },
    Signup: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' icon='Backward' title='用户注册'/>\
                <Content xmlns='signup'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.navbar.on("iconClick", e => this.trigger("back"));
        }
    },
    Update: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' icon='Backward' title='用户修改'/>\
                <Content xmlns='update'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.navbar.on("iconClick", e => this.trigger("back"));
        }
    },
    Chpasswd: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' icon='Backward' title='密码修改'/>\
                <Content xmlns='chpasswd'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.navbar.on("iconClick", e => this.trigger("back"));
        }
    }
});

$_("overview").imports({
    Content: {
        xml: "<i:Content id='content' xmlns:i='//xp' xmlns:k='//xp/list'>\
                <k:List id='list'>\
                   <ListItem id='item'/>\
                </k:List>\
              </i:Content>",
        fun: function (sys, items, opts) {
            let proxy = sys.item.bind([]);
            sys.list.on("remove", (e, p) => {
                e.stopPropagation();
                if (confirm("确定删除该用户吗？")) {
                    this.trigger("publish", ["/users/remove", {id: p.id}]);
                    this.glance("/users/remove", (ev, p) => {
                        this.trigger("message", ["msg", p.desc]);
                        if (p.code == 0) {
                            let i = sys.list.kids().indexOf(e.target);
                            delete proxy.model[i];
                        }
                    });
                }
            });
            this.watch("/users/select", (e, data) => proxy.model = data);
        }
    },
    ListItem: {
        css: "#icon { width: 28px; height: 28px; }",
        xml: "<i:Swipeout id='item' xmlns:i='//xp/swipeout'>\
                 <Content xmlns='//xp/list'>\
                    <Media><Icon id='icon' xmlns='/'/></Media>\
                    <Inner id='inner'>\
                      <Title id='title'>\
                        <Header id='header'>普通用户</Header>\
                        <div id='label'/>\
                        <Footer id='last_login'/>\
                      </Title>\
                    </Inner>\
                 </Content>\
                 <i:Actions>\
                   <i:Button id='edit'>编辑</i:Button>\
                   <i:Button id='remove' color='red'>删除</i:Button>\
                 </i:Actions>\
              </i:Swipeout>",
        map: { bind: { name: "label" } },
        fun: function (sys, items, opts) {
            this.on("$/before/bind", (e, value) => opts = value);
            sys.edit.on(ev.click, () => this.trigger("goto", ["update", opts]));
            sys.remove.on(ev.click, () => this.trigger("remove", opts));
            function id(value) {
                if (value == undefined)
                    return opts.id;
                if (value == 0)
                    sys.header.text("管理员") && sys.remove && sys.remove.remove();
            }
            return { id: id };
        }
    }
});

$_("signup").imports({
    Content: {
        xml: "<Content id='content' xmlns='//xp' xmlns:i='form'>\
                  <i:Form id='signup'>\
                    <i:User id='user'/>\
                    <i:Email id='email'/>\
                    <i:Pass id='pass'/>\
                    <i:Livetime id='livetime'/>\
                    <i:Relogin id='relogin'/>\
                    <i:Remarks id='remarks'/>\
                  </i:Form>\
                  <i:Button id='submit'>注册</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.remarks.watch("next", (e, p) => {
                this.trigger("/mask/show");
                this.trigger("publish", ["/users/signup", p]);
                this.glance("/users/signup", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                if (p.code == 0) {
                    sys.content.trigger("back");
                    sys.content.trigger("publish", "/users/select");
                }
            }
            this.watch("#/view/ready", (e, prev, data) => {
                items.email.value = "";
                items.pass.value = "";
                items.livetime.value = "";
                items.remarks.valie = "";
                items.user.value = "";
                items.user.focus();
            });
            sys.submit.on(ev.click, () => sys.signup.notify("next", {}));
        }
    }
});

$_("signup/form").imports({
    Form: {
        xml: "<List id='form' xmlns='//xp/list'/>",
        map: { msgFilter: /next/ },
        fun: function (sys, items, opts) {
            this.on("error", (e, el, msg) => {
                e.stopPropagation();
                el.stopNotification();
                el.currentTarget.val().focus();
                this.trigger("message", ["error", msg]);
            });
        }
    },
    User: {
        xml: "<Input id='user' label='用户名' placeholder='请输入用户名' maxlength='32'/>",
        map: { attrs: { user: "readonly" } },
        fun: function (sys, items, opts) {
            var patt = /^[a-z0-9_]{4,32}$/i;
            this.watch("next", (e, o) => {
                o.name = items.user.value;
                if (o.name === "") {
                    this.trigger("error", [e, "请输入用户名"]);
                } else if (o.name.length < 4) {
                    this.trigger("error", [e, "用户名至少需要4个字符"]);
                } else if (!patt.test(o.name)) {
                    this.trigger("error", [e, "您输入的用户名有误"]);
                }
            });
            return items.user;
        }
    },
    Email: {
        xml: "<Input id='email' label='邮箱' placeholder='请输入邮箱' maxlength='32'/>",
        fun: function (sys, items, opts) {
            var patt = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
            this.watch("next", (e, o) => {
                o.email = items.email.value;
                if (o.email == "") {
                    this.trigger("error", [e, "请输入邮箱"]);
                } else if (o.email.length < 6) {
                    this.trigger("error", [e, "邮箱至少需要6个字符"]);
                } else if (!patt.test(o.email)) {
                    this.trigger("error", [e, "您输入的邮箱有误"]);
                }
            });
            return items.email;
        }
    },
    Pass: {
        xml: "<Input id='pass' label='密码' placeholder='请输入密码' type='password' maxlength='16'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.pass = items.pass.value;
                if (o.pass === "") {
                    this.trigger("error", [e, "请输入密码"]);
                } else if (o.pass.length < 5) {
                    this.trigger("error", [e, "密码至少需要5个字符"]);
                }
            });
            return items.pass;
        }
    },
    Remarks: {
        xml: "<Input id='remarks' label='备注' placeholder='备注不是必需的' maxlength='256'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.remarks = items.remarks.value;
                if (o.remarks.length > 256) {
                    this.trigger("error", [e, "备注长度不得大于 256 位"]);
                }
            });
            return items.remarks;
        }
    },
    Livetime: {
        xml: "<Input id='livetime' type='number' label='登录时效/天' placeholder='请输入登录时效'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.livetime = items.livetime.value;
                if (o.livetime === "") {
                    this.trigger("error", [e, "请输入登录时效"]);
                } else if (o.livetime > 365 || o.livetime < 1) {
                    this.trigger("error", [e, "登录时效在 1 至 365 之间"]);
                }
            });
            return items.livetime;
        }
    },
    ReLogin: {
        xml: "<ListItem xmlns='//xp/list'>\
                <Content>\
                  <Inner id='inner' xmlns='//xp/form'>\
                     <Label id='label'>重复登录</Label>\
                     <Select id='picker'>\
                        <option value='1'>允许</option>\
                        <option value='0'>不允许</option>\
                     </Select>\
                  </Inner>\
                </Content>\
              </ListItem>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, p) => {
                p.relogin = parseInt(this.val().value);
            });
            return items.picker.elem();
        }
    },
    Input: {
        xml: "<ListItem xmlns='//xp/list'>\
                <Content>\
                  <Inner id='inner' xmlns='//xp/form'>\
                    <Label id='label'/>\
                    <Input id='input'/>\
                  </Inner>\
                </Content>\
              </ListItem>",
        map: { attrs: { input: "type maxlength placeholder readonly style" } },
        fun: function (sys, items, opts) { 
            sys.label.text(opts.label);;
            return items.input.elem();
        }
    },
    Button: {
        css: "#button { margin: 35px 0; }",
        xml: "<Button id='button' xmlns='//xp/form'/>"
    }
});

$_("update").imports({
    Content: {
        xml: "<Content id='content' xmlns='//xp' xmlns:i='../signup/form'>\
                  <i:Form id='update'>\
                    <i:GUID id='id' xmlns:i='.'/>\
                    <i:User id='user'/>\
                    <i:Email id='email'/>\
                    <i:Livetime id='livetime'/>\
                    <i:Relogin id='relogin'/>\
                    <i:Remarks id='remarks'/>\
                  </i:Form>\
                  <i:Button id='submit'>确定更新</i:Button>\
                  <i:Button id='chpasswd'>密码修改</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.remarks.watch("next", (e, p) => {
                this.trigger("/mask/show");
                this.trigger("publish", ["/users/update", p]);
                this.glance("/users/update", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                if (p.code == 0) {
                    sys.content.trigger("back");
                    sys.content.trigger("publish", "/users/select");
                }
            }
            this.watch("#/view/ready", (e, prev, data) => {
                if (!data) return;
                opts = data;
                items.id.value = data.id;
                items.user.value = data.name;
                items.email.value = data.email;
                items.remarks.value = data.remarks || ""
                items.livetime.value = data.livetime;
                items.relogin.value = data.relogin;
            });
            sys.submit.on(ev.click, () => sys.update.notify("next", {}));
            sys.chpasswd.on(ev.click, () => this.trigger("goto", ["chpasswd", opts]));
        }
    },
    GUID: {
        css: "#id { display: none; }",
        xml: "<Input id='id' label='标识符' maxlength='32' style='font-size: 14px' xmlns='../signup/form'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => o.id = parseInt(items.id.value));
            return items.id;
        }
    }
});

$_("chpasswd").imports({
    Content: {
        xml: "<Content id='content' xmlns='//xp' xmlns:i='../signup/form'>\
                 <i:Form id='chpasswd'>\
                    <i:GUID id='id' xmlns:i='../update'/>\
                    <i:User id='user' readonly='true'/>\
                    <i:Pass id='pass'/>\
                    <i:NewPass id='new_pass' xmlns:i='.'/>\
                 </i:Form>\
                 <i:Button id='submit'>确定修改</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.new_pass.watch("next", (e, p) => {
                this.trigger("/mask/show");
                this.trigger("publish", ["/users/chpasswd", p]);
                this.glance("/users/chpasswd", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                p.code || sys.content.trigger("back");
            }
            this.watch("#/view/ready", (e, prev, data) => {
                items.id.value = data.id;
                items.user.value = data.name;
                items.pass.value = '';
                items.new_pass.value = '';
            });
            sys.submit.on(ev.click, () => sys.chpasswd.notify("next", {}));
        }
    },
    NewPass: {
        xml: "<Input id='pass' label='新密码' placeholder='请输入新密码' type='password' maxlength='16' xmlns='../signup/form'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.new_pass = items.pass.value;
                if (o.new_pass === "") {
                    this.trigger("error", [e, "请输入新密码"]);
                } else if (o.new_pass.length < 5) {
                    this.trigger("error", [e, "新密码至少需要5个字符"]);
                }
            });
            return items.pass;
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}