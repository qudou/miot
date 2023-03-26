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
		css: "#icon { width: 28px; height: 28px; }",
        xml: "<i:Swipeout id='item' xmlns:i='//xp/swipeout'>\
                 <Content xmlns='//xp/list'>\
                    <Media><Icon id='icon' xmlns='/'/></Media>\
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
				  <i:Button id='reboot'>重启服务</i:Button>\
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
				opts = data;
                items.oldId.value = data.id;
                items.newId.value = data.id;
                items.view.value = data.name;
                items.desc.value = data.desc;
            });
            sys.submit.on(ev.click, () => sys.update.notify("next", {}));
            sys.reboot.on(ev.click, () => {
				if (confirm("确定重启服务吗？")) {
					this.trigger("publish", ["/views/reboot", opts.id]);
					this.trigger("message", ["msg", "服务将在 10s 后重启"]);
				}
			});
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