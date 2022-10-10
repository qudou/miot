/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("c258080a-d635-4e1b-a61f-48ff552c146a", (xp, $_) => { // 视图管理

$_().imports({
    Index: {
        xml: "<i:ViewStack xmlns:i='//miot/widget'>\
                <Overview id='overview'/>\
                <Signup id='signup'/>\
                <Update id='update'/>\
                <Remove id='remove'/>\
                <Service id='service'/>\
              </i:ViewStack>",
        fun: function (sys, items, opts) {
            this.trigger("publish", "/views/select");
        }
    },
    Overview: {
        xml: "<div id='overview' xmlns:i='overview'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Signup: {
        xml: "<div id='signup' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='视图注册'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, prev, keep) => {
                keep || items.content();
            });
        }
    },
    Update: {
        xml: "<div id='update' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='视图修改'/>\
                <Content id='content' xmlns='update'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, prev, data) => {
                data && items.content(data);
            });
        }
    },
    Remove: {
        fun: function (sys, items, opts) {
            this.watch("remove", (e, p) => {
                window.app.dialog.confirm("确定删除该视图吗？", "温馨提示", () => {
                    this.trigger("publish", ["/views/remove", {id: p.id}]);
                    this.glance("/views/remove", (m, p) => {
                        this.trigger("message", ["msg", p.desc]);
                        p.code == 0 && e.target.remove();
                    },1);
                });
            });
        }
    },
    Service: {
        css: "#service { visibility: visible; opacity: 1; background: #EFEFF4; }",
        xml: "<Overlay id='service' xmlns='//miot/verify'/>"
    }
});

$_("overview").imports({
    Navbar: {
        map: { extend: { "from": "//miot/widget/Navbar" } },
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Close xmlns='//miot/assets'/></a>\
                 </div>\
                 <div id='title'>视图管理</div>\
                 <div id='right'>\
                  <a id='menu' href='#'>注册</a>\
                 </div>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
            sys.menu.on(Click, () => this.trigger("goto", "signup"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' style='padding-top: 44px;'>\
                  <ViewList id='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/views/select", (e, data) => {
                sys.list.kids().call("remove");
                data.length ? sys.list.show() : sys.list.hide();
                data.forEach(item => {
                    let view = sys.list.append("ViewItem").val();
                    view.value = item;
                });
            });
            this.watch("/views/remove", (e, p) => {
                sys.list.kids().length || sys.list.hide();
            });
        }
    },
    ViewList: {
        xml: "<div class='list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    ViewItem: {
        css: "#icon { width: 28px; height: 28px; border-radius: 6px; box-sizing: border-box; }",
        xml: "<li class='swipeout deleted-callback'>\
               <div class='item-content swipeout-content'>\
                 <div class='item-media'><i id='icon' class='icon icon-f7'><Icon/></i></div>\
                 <div class='item-inner'>\
                   <div class='item-title'>\
                     <div id='label'/>\
                     <div id='id' class='item-footer'/>\
                   </div>\
                 </div>\
               </div>\
               <div class='swipeout-actions-right'>\
                 <a id='edit' href='#' class='color-blue'>编辑</a>\
                 <a id='remove' href='#' class='color-red'>删除</a>\
               </div>\
              </li>",
        fun: function (sys, items, opts) {
            let view;
            sys.edit.on(Click, () => this.trigger("goto", ["update", view]));
            function setValue(value) {
                view = value;
                sys.label.text(view.name);
                sys.id.text(view.id);
            }
            sys.remove.on(Click, () => this.notify("remove", view));
            return Object.defineProperty({}, "value", { set: setValue});
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
    Navbar: {
        map: { extend: { "from": "//miot/widget/Navbar" } },
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Backward xmlns='//miot/assets'/></a>\
                 </div>\
                 <div id='title'/>\
                 <div id='right'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.title.text(opts.title);
            sys.icon.on(Click, e => this.trigger("back"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='form' style='padding-top: 44px;'>\
                    <i:Form id='signup'>\
                      <i:View id='view'/>\
                      <i:Desc id='desc'/>\
                    </i:Form>\
                    <i:Button id='submit'>注册</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.desc.on("next", (e, p) => {
                e.stopPropagation();
                this.trigger("goto", "service");
                this.trigger("publish", ["/views/signup", p]);
                this.glance("/views/signup", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                e.target.trigger("back", true);
                p.code || e.target.trigger("publish", "/views/select");
            }
            sys.submit.on(Click, items.signup.start);
            return function () {
                items.view.val("").focus();
                items.desc.val("");
            };
        }
    }
});

$_("signup/form").imports({
    Form: {
        xml: "<form id='form' class='list form-store-data'>\
                <div class='list'>\
                  <ul id='content'/>\
                </div>\
              </form>",
        map: { "appendTo": "content" },
        fun: function (sys, items, opts) {
            let ptr, first = this.first();
            this.on("next", (e, r) => {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("start", r);
            });
            function start() {
                ptr = first;
                ptr.trigger("start", {});
            }
            this.on("start", e => e.stopPropagation());
            return { start: start };
        }
    },
    View: {
        xml: "<Input id='view' label='名称' placeholder='请输入视图名称' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.view.focus();
                sys.view.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.name = items.view.val();
                if (o.name === "") {
                    error("请输入视图名称");
                } else if (o.name.length < 2) {
                    error("视图名称至少需要2个字符");
                } else {
                    sys.view.trigger("next", o);
                }
            });
            return items.view;
        }
    },
    Desc: {
        xml: "<Input id='desc' label='描述' placeholder='描述是可选的' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.on("start", function (e, o) {
                o.desc = items.desc.val();
                sys.desc.trigger("next", o);
            });
            return items.desc;
        }
    },
    Button: {
        xml: "<div class='list'><ul><li>\
                <a id='label' href='#' class='item-link list-button'/>\
              </li></ul></div>",
        map: { appendTo: "label" },
    },
    Input: {
        xml: "<li id='input'>\
               <div class='item-content item-input'>\
                 <div class='item-inner'>\
                   <div id='label' class='item-title item-label'>Name</div>\
                   <div class='item-input-wrap'>\
                     <input id='text' type='text' name='name'/>\
                   </div>\
                 </div>\
               </div>\
              </li>",
        map: { attrs: { text: "name value type maxlength placeholder disabled style" } },
        fun: function (sys, items, opts) { 
            sys.label.text(opts.label);
            function focus() {
                sys.text.elem().focus();
                return this;
            }
            function val(value) {
                if ( value == undefined )
                    return sys.text.prop("value");
                sys.text.prop("value", value);
                return this;
            }
            return { val: val, focus: focus };
        }
    }
});

$_("update").imports({
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='../signup/form' style='padding-top: 44px;'>\
                    <i:Form id='update'>\
                      <GUID id='id'/>\
                      <i:View id='view'/>\
                      <i:Desc id='desc'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定更新</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.desc.on("next", (e) => {
                e.stopPropagation();
                let p = {id:items.id.val(), name:items.view.val(),desc:items.desc.val()};
                this.trigger("goto", "service");
                this.trigger("publish", ["/views/update", p]);
                this.glance("/views/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                e.target.trigger("back");
                p.code || e.target.trigger("publish", "/views/select");
            }
            sys.submit.on(Click, items.update.start);
            return function (value) {
                items.id.val(value.id);
                items.view.val(value.name);
                items.desc.val(value.desc);
            };
        }
    },
    GUID: {
        xml: "<Input id='id' label='标识符' style='font-size:14px;' maxlength='32' xmlns='../signup/form'/>",
        fun: function (sys, items, opts) {
            this.on("start", function (e, o) {
                o.id = items.id.val();
                sys.id.trigger("next", o);
            });
            return items.id;
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}