/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("9cd179c0-7231-4d08-b015-0fccf2086302", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<i:ViewStack id='index' xmlns:i='//miot'>\
                <Overview id='overview'/>\
                <Signup id='signup'/>\
                <Update id='update'/>\
                <Remove id='remove'/>\
                <Service id='service'/>\
              </i:ViewStack>",
        fun: function (sys, items, opts) {
            items.overview.title(opts.name);
            this.trigger("publish", "/links/select");
            this.trigger("publish", "/links/areas");
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
                <i:Navbar id='navbar' title='网关注册'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", items.content.clear);
        }
    },
    Update: {
        xml: "<div id='update' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='网关修改'/>\
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
                window.app.dialog.confirm("确定删除该网关吗？", "温馨提示", () => {
                    this.trigger("publish", ["/links/remove", {id: p.id}]);
                    this.watch("/links/remove", (m, p) => {
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
        xml: "<div class='page'>\
                <div id='content' class='page-content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/links/select", (e, data) => {
                let area = -1, list;
                sys.content.children().call("remove");
                data.forEach(item => {
                    if (area != item.area) {
                        area = item.area;
                        sys.content.append("Title").text(item.areaName);
                        list = sys.content.append("LinkList");
                    }
                    list.append("LinkItem").value().value = item;
                });
            });
        }
    },
    Title: {
        xml: "<div class='block-title'/>"
    },
    LinkList: {
        xml: "<div class='list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    LinkItem: {
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
            sys.edit.on(Click, () => this.trigger("switch", ["update", opts]));
            function setValue(link) {
                opts = link;
                sys.label.text(link.name);
                sys.id.text(link.id);
            }
            sys.remove.on(Click, () => this.notify("remove", opts));
            return Object.defineProperty({}, "value", { set: setValue});
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
                      <i:Link id='link'/>\
                      <i:Area id='area'/>\
                    </i:Form>\
                    <i:Button id='submit'>注册</i:Button>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            sys.submit.on(Click, items.signup.start);
            sys.area.on("next", (e, p) => {
                e.stopPropagation();
                this.trigger("switch", "service");
                this.trigger("publish", ["/links/signup", p]);
                this.glance("/links/signup", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                if (p.code == -1) 
                    return e.target.trigger("switch", "signup");
                e.target.trigger("publish", "/links/select").trigger("switch", "overview");
            }
            function clear() {
                items.link.val("").focus();
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
    Link: {
        xml: "<Input id='link' label='名称' placeholder='areaname' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.link.focus();
                sys.link.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.name = items.link.val();
                if (o.name === "") {
                    error("请输入连接名称");
                } else if (o.name.length < 2) {
                    error("连接名至少需要2个字符");
                } else {
                    sys.link.trigger("next", o);
                }
            });
            return items.link;
        }
    },
    Area: {
        css: ".sheet-modal { z-index: 100000; }",
        xml: "<li>\
                  <div class='item-content item-input'>\
                    <div class='item-inner'>\
                      <div id='label' class='item-title item-label'>区域</div>\
                      <div class='item-input-wrap'>\
                        <input id='input' type='text' readonly='readonly'/>\
                      </div>\
                    </div>\
                  </div>\
              </li>",
        fun: function (sys, items, opts) {
            let picker, table = {}; 
            this.watch("/links/areas", (e, data) => {
                window.app.picker.destroy(sys.input.elem());
                picker = window.app.picker.create({
                    inputEl: sys.input.elem(),
                    rotateEffect: true,
                    toolbarCloseText: "确定",
                    cols: [{values: data.map(i=>{return i.name})}],
                    value: [data[0].name]
                });
                data.map(i=>table[i.name]=i);
            });
            function getValue() {
                return table[picker.value[0]].id;
            }
            function setValue(value) {
                picker.setValue([value]);
            }
            this.on("start", (e, p) => {
                p.area = getValue();
                this.trigger("next", p);
            });
            return { getValue:getValue, setValue: setValue };
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
                      <i:Link id='link'/>\
                      <i:Area id='area'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定更新</i:Button>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            sys.submit.on(Click, items.update.start);
            function val(value) {
                opts = value;
                items.id.val(value.id);
                items.link.val(value.name);
                items.area.setValue(value.areaName);
            }
            sys.area.on("next", (e) => {
                e.stopPropagation();
                let p = {id:opts.id, name:items.link.val(),area:items.area.getValue()};
                this.trigger("switch", "service");
                this.trigger("publish", ["/links/update", p]);
                this.glance("/links/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                if (p.code == -1)
                    return e.target.trigger("switch", "update");
                e.target.trigger("publish", "/links/select").trigger("switch", "overview");
            }
            return {val: val};
        }
    },
    GUID: {
        xml: "<Input id='id' label='标识符' disabled='true' style='font-size:14px;' maxlength='32' xmlns='../signup/form'/>",
        fun: function (sys, items, opts) {
            this.on("start", (e, o) => {
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