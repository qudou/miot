/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("c258080a-d635-4e1b-a61f-48ff552c146a", (xp, $_) => { // 视图管理

$_().imports({
    Index: {
        css: "#stack { width: 100%; height: 100%; }",
        xml: "<i:Applet xmlns:i='//xp'>\
                <i:ViewStack id='stack'>\
                  <Overview id='overview'/>\
                  <Signup id='signup'/>\
                  <Update id='update'/>\
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
            this.trigger("publish", "/views/select");
        }
    },
    Overview: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' title='视图管理' menu='注册'/>\
                <Content xmlns='overview'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.navbar.on("iconClick", e => this.trigger("close"));
            sys.navbar.on("menuClick", () => this.trigger("goto", "signup"));
        }
    },
    Signup: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' icon='Backward' title='视图注册'/>\
                <Content xmlns='signup'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.navbar.on("iconClick", e => this.trigger("back"));
        }
    },
    Update: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' icon='Backward' title='视图修改'/>\
                <Content xmlns='update'/>\
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
                if (confirm("确定删除该视图吗？")) {
                    this.trigger("publish", ["/views/remove", {id: p.id}]);
                    this.glance("/views/remove", (ev, p) => {
                        this.trigger("message", ["msg", p.desc]);
                        if (p.code == 0) {
                            let i = sys.list.kids().indexOf(e.target);
                            delete proxy.model[i];
                        }
                    });
                }
            });
            this.watch("/views/select", (e, data) => proxy.model = data);
        }
    },
    ListItem: {
        xml: "<i:Swipeout id='item' xmlns:i='//xp/swipeout'>\
                 <Content xmlns='//xp/list'>\
                    <Media><Icon xmlns='.'/></Media>\
                    <Inner id='inner'>\
                      <Title id='title'>\
                        <div id='label'/>\
                        <Footer id='id'/>\
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
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1092 1024' width='28' height='28'>\
                <path d='M546.133333 588.253867l-473.9072-271.701334v-25.258666c0-12.6976 6.280533-25.258667 18.978134-31.607467L546.133333 0.6144 565.111467 6.826667l454.929066 259.072v25.258666c0 12.6976-6.280533 25.258667-18.978133 31.607467L546.133333 588.253867zM188.2112 294.161067L546.133333 496.298667l363.7248-202.069334L546.133333 85.538133 188.2112 294.229333z'/>\
                <path d='M546.133333 799.061333L81.988267 518.7584c-19.114667-10.513067-20.48-27.716267-9.762134-50.517333 6.280533-12.6976 25.258667-18.978133 44.2368-12.6976L546.133333 708.334933l429.6704-246.442666a38.7072 38.7072 0 0 1 48.059734 13.994666 40.618667 40.618667 0 0 1-13.9264 49.5616L546.133333 799.061333z'/>\
                <path d='M546.133333 1005.841067l-464.145066-280.302934c-19.114667-10.4448-20.48-27.648-9.762134-50.517333 6.280533-12.629333 25.258667-18.978133 44.2368-12.629333L546.133333 915.114667l429.6704-246.442667a38.7072 38.7072 0 0 1 48.059734 14.062933 40.618667 40.618667 0 0 1-13.9264 49.493334L546.133333 1005.841067z'/>\
              </svg>"
    }
});

$_("signup").imports({
    Content: {
        xml: "<Content id='content' xmlns='//xp' xmlns:i='form'>\
                  <i:Form id='signup'>\
                      <i:View id='view'/>\
                      <i:Desc id='desc'/>\
                  </i:Form>\
                  <i:Button id='submit'>注册</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.desc.watch("next", (e, p) => {
                this.trigger("/mask/show");
                this.trigger("publish", ["/views/signup", p]);
                this.glance("/views/signup", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                if (p.code == 0) {
                    sys.content.trigger("back");
                    sys.content.trigger("publish", "/views/select");
                }
            }
            this.watch("#/view/ready", (e, prev) => {
                items.view.value = ""
                items.view.focus();
                items.desc.value = "";
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
    View: {
        xml: "<Input id='view' label='名称' placeholder='请输入视图名称' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.name = items.view.value;
                if (o.name === "") {
                    this.trigger("error", [e, "请输入视图名称"]);
                } else if (o.name.length < 2) {
                    this.trigger("error", [e, "视图名称至少需要2个字符"]);
                }
            });
            return items.view;
        }
    },
    Desc: {
        xml: "<Input id='desc' label='描述' placeholder='描述是可选的' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => o.desc = items.desc.value);
            return items.desc;
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
        map: { attrs: { input: "maxlength placeholder readonly style" } },
        fun: function (sys, items, opts) { 
            sys.label.text(opts.label);
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
                      <i:OldId id='oldId' xmlns:i='.'/>\
                      <i:NewId id='newId' xmlns:i='.'/>\
                      <i:View id='view'/>\
                      <i:Desc id='desc'/>\
                  </i:Form>\
                  <i:Button id='submit'>确定更新</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.desc.watch("next", (e, p) => {
                this.trigger("/mask/show");
                this.trigger("publish", ["/views/update", p]);
                this.glance("/views/update", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                if (p.code == 0) {
                    sys.content.trigger("back");
                    sys.content.trigger("publish", "/views/select");
                }
            }
            this.watch("#/view/ready", (e, prev, data) => {
                items.oldId.value = data.id;
                items.newId.value = data.id;
                items.view.value = data.name;
                items.desc.value = data.desc;
            });
            sys.submit.on(ev.click, () => sys.update.notify("next", {}));
        }
    },
    OldID: {
        css: "#id { display: none; }",
        xml: "<Input id='id' label='标识符' maxlength='36' style='font-size: 14px;' xmlns='../signup/form'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => o.id = items.id.value);
            return items.id;
        }
    },
    NewID: {
        xml: "<Input id='id' label='标识符' maxlength='36' style='font-size: 14px' xmlns='../signup/form'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.new_id = items.id.value;
                if (o.new_id.length != 36)
                    this.trigger("error", [e, "标识符长度必需等于36位"]);
            });
            return items.id;
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}