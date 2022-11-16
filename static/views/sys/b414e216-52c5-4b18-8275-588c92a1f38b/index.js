/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("b414e216-52c5-4b18-8275-588c92a1f38b", (xp, $_) => { // 应用管理

$_().imports({
    Index: {
        css: "#stack { width: 100%; height: 100%; }",
        xml: "<i:Applet xmlns:i='//xp'>\
                <i:ViewStack id='stack'>\
                  <Overview id='overview'/>\
                  <AppList id='applist'/>\
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
    AppList: {
        xml: "<div xmlns:i='applist'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Signup: {
        xml: "<div xmlns:i='signup'>\
                <i:Navbar id='navbar' title='应用注册'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Update: {
        xml: "<div xmlns:i='signup'>\
                <i:Navbar id='navbar' title='应用修改'/>\
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
            this.watch("/apps/views", (e, views) => {
                views.length ? this.trigger("publish", "/apps/areas") : this.trigger("goto", ["guide", "视图"]);
            });
            this.watch("/apps/areas", (e, areas) => {
                areas.length || this.trigger("goto", ["guide", "区域"]);
            });
            this.trigger("publish", "/apps/views");
        }
    }
});

$_("overview").imports({
    Navbar: {
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Close xmlns='//xp/assets'/></a>\
                 </div>\
                 <div id='title'>应用管理</div>\
                 <div id='right'/>\
              </div>",
        map: { extend: { from: "//xp/Navbar" } },
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
        }
    },
    Content: {
        xml: "<i:Content id='content' xmlns:i='//xp'>\
                  <ListItem id='item'/>\
              </i:Content>",
        fun: function (sys, items, opts) {
            let proxy = sys.item.bind([]);
            this.watch("/apps/areas", (e, data) => proxy.model = data);
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
            sys.list.on("goto", (e, target, data) => {
                target == "applist" && (data.area = opts);
            });
            this.on("$/before/bind", (e, value) => opts = value);
        }
    },
    LinkItem: {
        xml: "<ListItem xmlns='//xp/list'>\
                <Content style='link'>\
                   <Media><Icon xmlns='.'/></Media>\
                   <Inner id='inner' style='link'>\
                     <Title id='title'>\
                        <label id='label'/>\
                        <Footer id='id'/>\
                     </Title>\
                   </Inner>\
                </Content>\
              </ListItem>",
        map: { bind: { name: "label" } },
        fun: function (sys, items, opts) {
            this.on(Click, () => {
                this.trigger("goto", ["applist", {link: opts}]);
            });
            this.on("$/before/bind", (e, value) => opts = value);
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M768 864H256c-70.4 0-128-57.6-128-128v-128c0-70.4 57.6-128 128-128h64V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h256V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h64c70.4 0 128 57.6 128 128v128c0 70.4-57.6 128-128 128z m64-256c0-35.2-28.8-64-64-64H256c-35.2 0-64 28.8-64 64v128c0 35.2 28.8 64 64 64h512c35.2 0 64-28.8 64-64v-128z m-160 128c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z m-320 96c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z'/>\
              </svg>"
    }
});

$_("applist").imports({
    Navbar: {
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Backward xmlns='//xp/assets'/></a>\
                 </div>\
                 <div id='title'/>\
                 <div id='right'>\
                     <a id='menu' href='#'>注册</a>\
                 </div>\
              </div>",
        map: { extend: { from: "//xp/Navbar" } },
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("back"));
            sys.menu.on(Click, e => this.trigger("goto", ["signup", opts]));
            this.watch("#/view/ready", (e, prev, data) => {
                if (xp.isPlainObject(data)) {
                    opts = data;
                    sys.title.text(`${data.area.name}/${data.link.name}`);
                }
            });
        }
    },
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
                if (confirm("确定删除该应用吗？")) {
                    this.trigger("publish", ["/apps/remove", {id: p.id}]);
                    this.glance("/apps/remove", (ev, p) => {
                        this.trigger("message", ["msg", p.desc]);
                        if (p.code == 0) {
                            let i = sys.list.kids().indexOf(e.target);
                            delete proxy.model[i];
                        }
                    });
                }
            });
            this.on("goto", (e, target, data) => {
                target == "update" && (data.area = opts.area.id);
            });
            this.watch("#/view/ready", (e, prev, data) => {
                xp.isPlainObject(data) && (opts = data);
                data && this.trigger("publish", ["/apps/list", {link: opts.link.id}]);
            });
            this.watch("/apps/list", (e, data) => proxy.model = data);
        }
    },
    ListItem: {
        xml: "<i:Swipeout xmlns:i='//xp/swipeout'>\
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
            sys.edit.on(Click, () => this.trigger("goto", ["update", opts]));
            sys.remove.on(Click, () => this.trigger("remove", opts));
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M921.6 435.2H896V326.4c0-57.6-44.8-102.4-102.4-102.4H204.8c-12.8 0-25.6-12.8-25.6-25.6V76.8H102.4v121.6c0 57.6 44.8 102.4 102.4 102.4h588.8c12.8 0 25.6 12.8 25.6 25.6v108.8H102.4C44.8 435.2 0 480 0 531.2v320c0 57.6 44.8 102.4 102.4 102.4h819.2c57.6 0 102.4-44.8 102.4-102.4v-320c0-51.2-44.8-96-102.4-96z m25.6 416c0 12.8-12.8 25.6-25.6 25.6H102.4c-12.8 0-25.6-12.8-25.6-25.6v-320c0-12.8 12.8-25.6 25.6-25.6h819.2c12.8 0 25.6 12.8 25.6 25.6v320zM147.2 620.8h76.8V704H147.2V620.8z m153.6 0h76.8V704H300.8V620.8z m153.6 0h76.8V704H454.4V620.8z m416 44.8c0 19.2-19.2 38.4-38.4 38.4h-51.2c-19.2 0-38.4-19.2-38.4-38.4s19.2-38.4 38.4-38.4h51.2c19.2-6.4 38.4 12.8 38.4 38.4z'/>\
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
                   <i:Name id='nane'/>\
                   <i:Area id='area'/>\
                   <i:Link id='link'/>\
                   <i:View id='view'/>\
                   <i:Type id='type'/>\
                 </i:Form>\
                 <i:Button id='submit'>注册</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.type.watch("next", (e, p) => {
                opts = p;
                this.trigger("/mask/show");
                this.trigger("publish", ["/apps/signup", p]);
                this.glance("/apps/signup", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                p.code || sys.content.trigger("back", true);
            }
            sys.area.on("/areas/change", (e, area) => {
                e.stopPropagation();
                sys.link.notify(e.type, area);
            });
            this.watch("#/view/ready", (e, prev, data) => {
                items.nane.focus();
                items.nane.value = "";
                items.area.value = data.area.id;
                sys.link.notify("/areas/change", data.area.id);
                items.link.value = data.link.id;
                items.view.selectedIndex = 0;
                items.type.selectedIndex = 0;
            });
            sys.submit.on(Click, () => sys.signup.notify("next", {}));
        }
    }
});

$_("signup/form").imports({
    Form: {
        xml: "<List id='form' xmlns='//xp/list'/>",
        map: { appendTo: "form", msgFilter: /next/ },
        fun: function (sys, items, opts) {
            this.on("error", (e, el, msg) => {
                e.stopPropagation();
                el.stopNotification();
                el.currentTarget.val().focus();
                this.trigger("message", ["error", msg]);
            });
        }
    },
    Name: {
        xml: "<Input id='app' label='名称' placeholder='请输入应用名称' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.watch("next", function (e, o) {
                o.name = items.app.value;
                if (o.name === "") {
                    this.trigger("error", [e, "请输入应用名称"]);
                } else if (o.name.length < 2) {
                    this.trigger("error", [e, "应用名称至少需要2个字符"]);
                }
            });
            return items.app;
        }
    },
    Area: {
        xml: "<Select id='area' label='区域'>\
                <Option id='option'/>\
              </Select>",
        fun: function (sys, items, opts) {
            let proxy = sys.option.bind([]);
            this.watch("/apps/areas", (e, data) => proxy.model = data);
            this.on("change", (e) => {
                e.stopPropagation();
                this.trigger("/areas/change", items.area.value);
            });
            return items.area;
        }
    },
    Link: {
        xml: "<Select id='link' label='网关'>\
                <Option id='option'/>\
              </Select>",
        fun: function (sys, items, opts) {
            let areas = [];
            let proxy = sys.option.bind([]);
            this.watch("/areas/change", (e, area) => {
                proxy.model = areas.find(item => {
                    return item.id == area;
                }).links;
                items.link.selectedIndex = 0;
            });
            this.watch("/apps/areas", (e, data) => areas = data);
            this.watch("next", (e, p) => {
                if (proxy.model.length == 0)
                    return this.trigger("error", [e, "请在当前区域下创建网关"]);
                p.link = items.link.value;
            });
            return items.link;
        }
    },
    PUID: {
        xml: "<Input id='part' label='配件标识符' placeholder='请输入配件标识符' style='font-size: 14px'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.part = items.part.value;
                if (o.part === "") {
                    this.trigger("error", [e, "请输入配件标识符"]);
                } else if (o.part.length != 36) {
                    this.trigger("error", [e, "配件标识符需要36个字符"]);
                }
            });
            return items.part;
        }
    },
    View: {
        xml: "<Select id='view' label='视图'>\
                 <Option id='option'/>\
              </Select>",
        fun: function (sys, items, opts) {
            let proxy = sys.option.bind([]);
            this.watch("next", (e, p) => p.view = items.view.value);
            this.watch("/apps/views", (e, data) => proxy.model = data);
            return items.view;
        }
    },
    Type: {
        xml: "<Select id='type' label='类型'>\
                <option value='1'>无配件</option>\
                <option value='2'>有配件</option>\
              </Select>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, p) => p.type = items.type.value);
            return items.type
        }
    },
    Select: {
        xml: "<ListItem xmlns='//xp/list'>\
                <Content>\
                  <Inner id='inner' xmlns='//xp/form'>\
                    <Label id='label'/>\
                    <Select id='picker'/>\
                  </Inner>\
                </Content>\
              </ListItem>",
        map: { appendTo: "picker", attrs: { picker: "disabled" } },
        fun: function (sys, items, opts) {
            sys.label.text(opts.label);
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
                   <i:GUID id='guid' xmlns:i='.'/>\
                   <i:Name id='nane'/>\
                   <i:Area id='area'/>\
                   <i:Link id='link'/>\
                   <i:PUID id='puid'/>\
                   <i:View id='view'/>\
                   <i:Type id='type'/>\
                 </i:Form>\
                 <i:Button id='submit'>确定更新</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.type.watch("next", (e, p) => {
                opts = p;
                this.trigger("/mask/show");
                this.trigger("publish", ["/apps/update", p]);
                this.glance("/apps/update", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                p.code || sys.content.trigger("back", true);
            }
            sys.area.on("/areas/change", (e, area) => {
                e.stopPropagation();
                sys.link.notify(e.type, area);
            });
            this.watch("#/view/ready", (e, prev, data) => {
                items.guid.value = data.id;
                items.nane.value = data.name;
                items.area.value = data.area;
                sys.link.notify("/areas/change", data.area);
                items.link.value = data.link;
                items.puid.value = data.part;
                items.view.value = data.view;
                items.type.value = data.type;
            });
            sys.submit.on(Click, () => sys.update.notify("next", {}));
        }
    },
    GUID: {
        xml: "<Input id='id' label='标识符' maxlength='32' readonly='true' style='font-size: 14px' xmlns='../signup/form'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => o.id = items.id.value);
            return items.id;
        }
    }
});

$_("guide").imports({
    Navbar: {
        map: { extend: {from: "../overview/Navbar"} }
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