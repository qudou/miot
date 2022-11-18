/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("9cd179c0-7231-4d08-b015-0fccf2086302", (xp, $_) => { // 网关管理

$_().imports({
    Index: {
        css: "#stack { width: 100%; height: 100%; }",
        xml: "<i:Applet xmlns:i='//xp'>\
                <i:ViewStack id='stack'>\
                  <Overview id='overview'/>\
                  <Signup id='signup'/>\
                  <Update id='update'/>\
                  <Guide id='guide'/>\
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
        }
    },
    Overview: {
        xml: "<div xmlns:i='overview'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Signup: {
        xml: "<div xmlns:i='signup'>\
                <i:Navbar id='navbar' title='网关注册'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Update: {
        xml: "<div xmlns:i='signup'>\
                <i:Navbar id='navbar' title='网关修改'/>\
                <Content id='content' xmlns='update'/>\
              </div>"
    },
    Guide: {
        xml: "<div xmlns:i='guide'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
             this.watch("#/view/ready", (e, prev, data) => {
                items.content.text(`${data}不存在,请先添加${data}`);
            });
            this.watch("/links/select", (e, data) => {
                data.length || this.trigger("goto", ["guide", "区域"]);
            });
            this.trigger("publish", "/links/select");
        }
    }
});

$_("overview").imports({
    Navbar: {
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Close xmlns='//xp/assets'/></a>\
                 </div>\
                 <div id='title'>网关管理</div>\
                 <div id='right'>\
                    <a id='menu'>注册</a>\
                 </div>\
              </div>",
        map: { extend: { "from": "//xp/Navbar" } },
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
            sys.menu.on(Click, () => this.trigger("goto", "signup"));
        }
    },
    Content: {
        xml: "<i:Content id='content' xmlns:i='//xp'>\
                  <ListItem id='item'/>\
              </i:Content>",
        fun: function (sys, items, opts) {
            let proxy = sys.item.bind([]);
            this.watch("/links/select", (e, data) => proxy.model = data);
        }
    },
    ListItem: {
        xml: "<div id='listItem' xmlns:i='//xp/list'>\
                <Title id='title' xmlns='//xp/block'/>\
                <i:List id='list'>\
                   <LinkItem id='links'/>\
                </i:List>\
              </div>",
        map: { bind: { name: "title" } },
        fun: function (sys, items, opts) {
            sys.list.on("remove", (e, p) => {
                e.stopPropagation();
                if (confirm("确定删除该网关吗？")) {
                    this.trigger("publish", ["/links/remove", {id: p.id}]);
                    this.glance("/links/remove", (ev, p) => {
                        this.trigger("message", ["msg", p.desc]);
                        if (p.code == 0) {
                            let i = sys.list.kids().indexOf(e.target);
                            delete opts.links[i];
                        }
                    });
                }
            });
            this.on("$/after/bind", (e, value, model) => opts = model);
        }
    },
    LinkItem: {
        xml: "<i:Swipeout id='item' xmlns:i='//xp/swipeout'>\
                 <Content id='content' xmlns='//xp/list'>\
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
            sys.edit.on(Click, () => this.trigger("goto", ["update", opts]));
            sys.remove.on(Click, () => this.trigger("remove", opts));
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M768 864H256c-70.4 0-128-57.6-128-128v-128c0-70.4 57.6-128 128-128h64V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h256V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h64c70.4 0 128 57.6 128 128v128c0 70.4-57.6 128-128 128z m64-256c0-35.2-28.8-64-64-64H256c-35.2 0-64 28.8-64 64v128c0 35.2 28.8 64 64 64h512c35.2 0 64-28.8 64-64v-128z m-160 128c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z m-320 96c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z'/>\
              </svg>"
    }
});

$_("signup").imports({
    Navbar: {
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Backward xmlns='//xp/assets'/></a>\
                 </div>\
                 <div id='title'/>\
                 <div id='right'/>\
              </div>",
        map: { extend: { "from": "//xp/Navbar" } },
        fun: function (sys, items, opts) { 
            sys.title.text(opts.title);
            sys.icon.on(Click, e => this.trigger("back"));
        }
    },
    Content: {
        xml: "<Content id='content' xmlns='//xp' xmlns:i='form'>\
                  <i:Form id='signup'>\
                      <i:Link id='link'/>\
                      <i:Area id='area'/>\
                  </i:Form>\
                  <i:Button id='submit'>注册</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.area.watch("next", (e, p) => {
                this.trigger("/mask/show");
                this.trigger("publish", ["/links/signup", p]);
                this.glance("/links/signup", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                if (p.code == 0) {
                    sys.content.trigger("back");
                    sys.content.trigger("publish", "/links/select");
                }
            }
            this.watch("#/view/ready", (e, prev) => {
                items.link.value = "";
                items.link.focus();
                items.area.selectedIndex = 0;
            });
            sys.submit.on(Click, () => sys.signup.notify("next", {}));
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
    Link: {
        xml: "<Input id='link' label='名称' placeholder='请输入网关名称' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.watch("next", function (e, o) {
                o.name = items.link.value;
                if (o.name === "") {
                    this.trigger("error", [e, "请输入网关名称"]);
                } else if (o.name.length < 2) {
                    this.trigger("error", [e, "网关名至少需要2个字符"]);
                }
            });
            return items.link;
        }
    },
    Area: {
        xml: "<ListItem id='area' xmlns='//xp/list'>\
                <Content>\
                 <Inner id='inner' xmlns='//xp/form'>\
                    <Label id='label'>区域</Label>\
                    <Select id='picker'>\
                       <Option id='option' xmlns='.'/>\
                    </Select>\
                 </Inner>\
                </Content>\
              </ListItem>",
        fun: function (sys, items, opts) {
            let proxy = sys.option.bind([]); 
            this.watch("next", (e, p) => p.area = this.val().value);
            this.watch("/links/select", (e, data) => proxy.model = data);
            return items.picker.elem();
        }
    },
    Option: {
        xml: "<option id='option'/>",
        map: { bind: { id: "option" } },
        fun: function (sys, items, opts) {
            return { name: sys.option.text };
        }
    },
    Input: {
        xml: "<ListItem id='input' xmlns='//xp/list'>\
                <Content>\
                  <Inner id='inner' xmlns='//xp/form'>\
                     <Label id='label'/>\
                     <Input id='text'/>\
                  </Inner>\
                </Content>\
              </ListItem>",
        map: { attrs: { text: "maxlength placeholder readonly style" } },
        fun: function (sys, items, opts) { 
            sys.label.text(opts.label);
            return items.text.elem();
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
                    <OldID id='oldId' xmlns='.'/>\
                    <NewID id='newId' xmlns='.'/>\
                    <i:Link id='link'/>\
                    <i:Area id='area'/>\
                  </i:Form>\
                  <i:Button id='submit'>确定更新</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.area.watch("next", (e, p) => {
                this.trigger("/mask/show");
                this.trigger("publish", ["/links/update", p]);
                this.glance("/links/update", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                if (p.code == 0) {
                    sys.content.trigger("back");
                    sys.content.trigger("publish", "/links/select");
                }
            }
            this.watch("#/view/ready", (e, prev, data) => {
                items.oldId.value = data.id;
                items.newId.value = data.id;
                items.link.value = data.name;
                items.area.value = data.area;
            });
            sys.submit.on(Click, () => sys.update.notify("next", {}));
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

$_("guide").imports({
    Navbar: {
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Close xmlns='//xp/assets'/></a>\
                 </div>\
                 <div id='title'>网关管理</div>\
                 <div id='right'/>\
              </div>",
        map: { extend: { "from": "//xp/Navbar" } },
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
        }
    },
    Content: {
        css: "#content { text-align: center; margin: 5em 0; }",
        xml: "<Content id='content' xmlns='//xp'/>",
        fun: function (sys, items, opts) {
            return { text: sys.content.text };
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}