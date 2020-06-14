/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("c258080a-d635-4e1b-a61f-48ff552c146a", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<i:ViewStack xmlns:i='//miot'>\
                <Overview id='overview'/>\
                <Signup id='signup'/>\
                <Update id='update'/>\
                <Remove id='remove'/>\
                <Service id='service'/>\
              </i:ViewStack>",
        fun: function (sys, items, opts) {
            items.overview.title(opts.name);
            this.trigger("publish", "/classes/select");
        }
    },
    Overview: {
        xml: "<div id='overview' xmlns:i='overview'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            return {title: items.navbar.title};
        }
    },
    Signup: {
        xml: "<div id='signup' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='模板注册'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", items.content.clear);
        }
    },
    Update: {
        xml: "<div id='update' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='模板修改'/>\
                <Content id='content' xmlns='update'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, ptr, data) => {
                data && items.content.val(data);
            });
        }
    },
    Remove: {
        fun: function (sys, items, opts) {
            this.watch("remove", (e, p) => {
                window.app.dialog.confirm("确定该模板吗？", "温馨提示", () => {
                    this.trigger("publish", ["/classes/remove", {id: p.id}]);
                    this.watch("/classes/remove", (m, p) => {
                        this.trigger("message", ["msg", p.desc]);
                        p.code == 0 && e.target.remove();
                    });
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
        css: ".ios .navbar-inner { padding: 0 10px; }\
              .ios .navbar #close { margin-right: 0; width: 22px; height: 22px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only' style='margin:auto;'>xmark</i>\
                   </div>\
                   <div id='title' class='title'/>\
                   <div class='right'>\
                    <button id='signup' class='button' style='border:none;'>新增</button>\
                   </div>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on(Click, e => this.trigger("close"));
            sys.signup.on(Click, () => this.trigger("switch", "signup"));
            return { title: sys.title.text };
        }
    },
    Content: {
        css: "#vol { margin-top: 35px; }",
        xml: "<div id='content' class='page'>\
                <div class='page-content'>\
                  <ClassList id='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/classes/select", (e, data) => {
                sys.list.children().call("remove");
                data.forEach(item => {
                    let klass = sys.list.append("ClassItem").value();
                    klass.value = item;
                });
            });
        }
    },
    ClassList: {
        xml: "<div class='list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    ClassItem: {
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
            let klass;
            sys.edit.on(Click, () => this.trigger("switch", ["update", klass]));
            function setValue(value) {
                klass = value;
                sys.label.text(klass.name);
                sys.id.text(klass.id);
            }
            sys.remove.on(Click, () => this.notify("remove", klass));
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
        css: ".ios .navbar-inner { padding: 0 10px; }\
              .ios .navbar #back { margin-right: 0; width: 22px; height: 22px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='backward' class='left'>\
                      <i class='icon f7-icons ios-only' style='margin:auto;'>chevron_left_round</i>\
                   </div>\
                   <div id='title' class='title'>标题</div>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.title.text(opts.title);
            sys.backward.on(Click, e => this.trigger("switch", "overview"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='form'>\
                    <i:Form id='signup'>\
                      <i:Class id='klass'/>\
                      <i:Desc id='desc'/>\
                    </i:Form>\
                    <i:Button id='submit'>注册</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.submit.on(Click, items.signup.start);
            sys.desc.on("next", (e, p) => {
                e.stopPropagation();
                this.trigger("switch", "service");
                this.trigger("publish", ["/classes/signup", p]);
                this.glance("/classes/signup", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                if (p.code == -1) 
                    return e.target.trigger("switch", "signup");
                e.target.trigger("publish", "/classes/select").trigger("switch", "overview");
            }
            function clear() {
                items.klass.val("");
                items.desc.val("").focus();
            }
            return {clear: clear};
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
            this.on("next", function (e, r) {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("start", r, false);
            });
            function start() {
                ptr = first;
                ptr.trigger("start", {}, false);
            }
            return { start: start };
        }
    },
    Class: {
        xml: "<Input id='klass' label='名称' placeholder='class name' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.klass.focus();
                sys.klass.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.name = items.klass.val();
                if (o.name === "") {
                    error("请输入模板名称");
                } else if (o.name.length < 2) {
                    error("模板名称至少需要2个字符");
                } else {
                    sys.klass.trigger("next", o);
                }
            });
            return items.klass;
        }
    },
    Desc: {
        xml: "<Input id='desc' label='描述' placeholder='desc' maxlength='32'/>",
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
                     <input id='text' type='text' name='name' placeholder='Your name'/>\
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
                <div class='page-content' xmlns:i='../signup/form'>\
                    <i:Form id='update'>\
                      <GUID id='id'/>\
                      <i:Class id='klass'/>\
                      <i:Desc id='desc'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定更新</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.submit.on(Click, items.update.start);
            function val(value) {
                items.id.val(value.id);
                items.klass.val(value.name);
                items.desc.val(value.desc);
            }
            sys.desc.on("next", (e) => {
                e.stopPropagation();
                let p = {id:items.id.val(), name:items.klass.val(),desc:items.desc.val()};
                this.trigger("switch", "service");
                this.trigger("publish", ["/classes/update", p]);
                this.glance("/classes/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                if (p.code == -1)
                    return e.target.trigger("switch", "update");
                e.target.trigger("publish", "/classes/select").trigger("switch", "overview");
            }
            return {val: val};
        }
    },
    GUID: {
        xml: "<Input id='id' label='标识符' disabled='true' style='font-size:14px;' maxlength='32' xmlns='../signup/form'/>",
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