/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("760c6da2-a37b-4278-a9f5-7b4b54f523e5", (xp, $_) => { // 区域管理

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
            this.trigger("publish", "/areas/select");
        }
    },
    Overview: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' title='区域管理' menu='注册'/>\
                <Content xmlns='overview'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.navbar.on("iconClick", e => this.trigger("close"));
            sys.navbar.on("menuClick", () => this.trigger("goto", "signup"));
        }
    },
    Signup: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' icon='Backward' title='区域注册'/>\
                <Content xmlns='signup'/>\
              </div>",
        fun: function (sys, items, opts) {
            sys.navbar.on("iconClick", e => this.trigger("back"));
        }
    },
    Update: {
        xml: "<div xmlns:i='//xp'>\
                <i:Navbar id='navbar' icon='Backward' title='区域修改'/>\
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
                if (confirm("确定删除该用户吗？")) {
                    this.trigger("publish", ["/areas/remove", {id: p.id}]);
                    this.glance("/areas/remove", (ev, p) => {
                        this.trigger("message", ["msg", p.desc]);
                        if (p.code == 0) {
                            let i = sys.list.kids().indexOf(e.target);
                            delete proxy.model[i];
                        }
                    });
                }
            });
            this.watch("/areas/select", (e, data) => proxy.model = data);
        }
    },
    ListItem: {
        xml: "<i:Swipeout id='item' xmlns:i='//xp/swipeout'>\
                 <Content id='content' xmlns='//xp/list'>\
                    <Media><Icon xmlns='.'/></Media>\
                    <Inner id='inner'>\
                      <div id='title'/>\
                    </Inner>\
                 </Content>\
                 <i:Actions>\
                   <i:Button id='edit'>编辑</i:Button>\
                   <i:Button id='remove' color='red'>删除</i:Button>\
                 </i:Actions>\
              </i:Swipeout>",
        map: { bind: { name: "title" } },
        fun: function (sys, items, opts) {
            this.on("$/before/bind", (e, value) => opts = value);
            sys.edit.on(ev.click, e => this.trigger("goto", ["update", opts]));
            sys.remove.on(ev.click, () => this.trigger("remove", opts));
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M309.474912 719.986985c26.89658 0 48.695049-21.798469 48.695049-48.646953l-49.715285-264.667915c0-26.920116-21.798469-48.767703-48.695049-48.767703L136.249639 357.904413c-26.89658 0-48.646953 21.847587-48.646953 48.767703l49.715285 264.667915c0 26.848485 21.750373 48.646953 48.646953 48.646953L309.474912 719.986985z' p-id='6348'></path><path d='M591.985194 719.986985c26.89658 0 48.646953-21.798469 48.646953-48.646953l49.714262-476.756311c0-26.89658-21.750373-48.719608-48.646953-48.719608L418.711825 145.864112c-26.847461 0-48.744167 21.823028-48.744167 48.719608l49.715285 476.756311c0 26.848485 21.895683 48.646953 48.743144 48.646953L591.985194 719.986985z' p-id='6349'></path><path d='M874.446357 719.986985c26.89658 0 48.744167-21.798469 48.744167-48.646953L923.190525 547.709293c0-26.921139-21.847587-48.743144-48.744167-48.743144l-73.844845 0c-26.846438 0-35.634592 15.730263-48.694025 48.743144l-49.715285 123.630738c0 26.848485 21.847587 48.646953 48.695049 48.646953L874.446357 719.986985z' p-id='6350'></path><path d='M913.139611 773.779122 146.930909 773.779122c-12.720719 0-23.206538 10.414187-23.206538 23.231097 0 12.792351 18.157545 53.550637 30.974455 53.550637l758.440785-30.271444c12.769838 0 23.25668-10.486842 23.25668-23.279193C936.395268 784.193309 925.908426 773.779122 913.139611 773.779122z'/>\
              </svg>"
    }
});

$_("signup").imports({
    Content: {
        xml: "<Content id='content' xmlns='//xp' xmlns:i='form'>\
                  <i:Form id='signup'>\
                      <i:Area id='area'/>\
                      <i:Desc id='desc'/>\
                  </i:Form>\
                  <i:Button id='submit'>注册</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.desc.watch("next", (e, p) => {
                this.trigger("//mask/show");
                this.trigger("publish", ["/areas/signup", p]);
                this.glance("/areas/signup", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                if (p.code == 0) {
                    sys.content.trigger("back");
                    sys.content.trigger("publish", "/areas/select");
                }
            }
            this.watch("#/view/ready", (e, prev, data) => {
                items.area.value = "";
                items.area.focus();
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
    Area: {
        xml: "<Input id='area' label='名称' placeholder='请输入区域名称' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.name = items.area.value;
                if (o.name === "") {
                   this.trigger("error", [e, "请输入区域名称"]);
                } else if (o.name.length < 2) {
                    this.trigger("error", [e, "区域名至少需要2个字符"]);
                }
            });
            return items.area;
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
        map: { attrs: { input: "maxlength placeholder style" } },
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
                      <GUID id='id' xmlns='.'/>\
                      <i:Area id='area'/>\
                      <i:Desc id='desc'/>\
                  </i:Form>\
                  <i:Button id='submit'>确定更新</i:Button>\
              </Content>",
        fun: function (sys, items, opts) {
            sys.desc.watch("next", (e, p) => {
                this.trigger("/mask/show");
                this.trigger("publish", ["/areas/update", p]);
                this.glance("/areas/update", callback);
            });
            function callback(e, p) {
                sys.content.trigger("/mask/hide");
                sys.content.trigger("message", ["msg", p.desc]);
                if (p.code == 0) {
                    sys.content.trigger("back");
                    sys.content.trigger("publish", "/areas/select");
                }
            }
            this.watch("#/view/ready", (e, prev, data) => {
                items.id.value = data.id;
                items.area.value = data.name;
                items.desc.value = data.desc;
            });
            sys.submit.on(ev.click, () => sys.update.notify("next", {}));
        }
    },
    GUID: {
        css: "#id { display: none; }",
        xml: "<Input id='id' label='标识符' style='font-size:14px' maxlength='32' xmlns='../signup/form'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => o.id = parseInt(items.id.value));
            return items.id;
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}