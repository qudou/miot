/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("9cd179c0-7231-4d08-b015-0fccf2086302", (xp, $_) => { // 网关管理

$_().imports({
    Index: {
        xml: "<i:ViewStack id='index' xmlns:i='//miot/widget'>\
                <Overview id='overview'/>\
                <Signup id='signup'/>\
                <Update id='update'/>\
                <Remove id='remove'/>\
                <Service id='service'/>\
                <Guide id='guide'/>\
              </i:ViewStack>"
    },
    Overview: {
        xml: "<div id='overview' xmlns:i='overview'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Signup: {
        xml: "<div id='signup' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='网关注册'/>\
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
                <i:Navbar id='navbar' title='网关修改'/>\
                <Content id='content' xmlns='update'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, ptr, data) => {
                data && items.content(data);
            });
        }
    },
    Remove: {
        fun: function (sys, items, opts) {
            this.watch("remove", (e, p) => {
                window.app.dialog.confirm("确定删除该网关吗？", "温馨提示", () => {
                    this.trigger("publish", ["/links/remove", {id: p.id}]);
                    this.glance("/links/remove", (m, p) => {
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
    },
    Guide: {
        xml: "<div id='guide' xmlns:i='guide'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, to, p) => {
                items.content.text(`${p}不存在,请先添加${p}`);
            });
            this.watch("/links/areas", (e, data) => {
                data.length ? this.trigger("publish", "/links/select") : this.trigger("goto", ["guide", "区域"]);
            });
            this.trigger("publish", "/links/areas");
        }
    }
});

$_("overview").imports({
    Navbar: {
        map: { extend: { "from": "//miot/widget/Navbar" } },
        xml: "<div id='navbar'>\
			     <div id='left'>\
				    <a id='icon'><Close xmlns='//miot/assets'/></a>\
			     </div>\
			     <div id='title'>网关管理</div>\
			     <div id='right'>\
				    <a id='menu'>注册</a>\
			     </div>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
            sys.menu.on(Click, () => this.trigger("goto", "signup"));
        }
    },
    Content: {
        xml: "<div class='page'>\
                <div id='content' class='page-content' style='padding-top: 44px;'/>\
              </div>",
        fun: function (sys, items, opts) {
            let areas = {};
            this.watch("/links/areas", (e, data) => {
                sys.content.kids().call("remove");
                data.forEach(item => {
                    sys.content.append("Title").text(item.name);
                    areas[item.id] = sys.content.append("LinkList");
                });
            });
            this.watch("/links/select", (e, data) => {
                data.forEach(item => {
                    areas[item.area].append("LinkItem").val().value = item;
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
            sys.edit.on(Click, () => this.trigger("goto", ["update", opts]));
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
                      <i:Link id='link'/>\
                      <i:Area id='area'/>\
                    </i:Form>\
                    <i:Button id='submit'>注册</i:Button>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            sys.area.on("next", (e, p) => {
                e.stopPropagation();
                this.trigger("goto", "service");
                this.trigger("publish", ["/links/signup", p]);
                this.glance("/links/signup", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
				e.target.trigger("back", true);
                p.code || e.target.trigger("publish", "/links/areas");
            }
			sys.submit.on(Click, items.signup.start);
            return function () {
                items.link.val("").focus();
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
            this.on("next", function (e, r) {
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
    Link: {
        xml: "<Input id='link' label='名称' placeholder='请输入网关名称' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.link.focus();
                sys.link.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.name = items.link.val();
                if (o.name === "") {
                    error("请输入网关名称");
                } else if (o.name.length < 2) {
                    error("网关名至少需要2个字符");
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
                if (data.length == 0) return;
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
                <div class='page-content' xmlns:i='../signup/form' style='padding-top: 44px;'>\
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
            sys.area.on("next", (e) => {
                e.stopPropagation();
                let p = {id:opts.id, name:items.link.val(),area:items.area.getValue()};
                this.trigger("goto", "service");
                this.trigger("publish", ["/links/update", p]);
                this.glance("/links/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
				e.target.trigger("back");
                p.code || e.target.trigger("publish", "/links/areas");
            }
			sys.submit.on(Click, items.update.start);
            return function (value) {
                opts = value;
                items.id.val(value.id);
                items.link.val(value.name);
                items.area.setValue(value.areaName);
            };
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

$_("guide").imports({
    Navbar: {
        map: { extend: { "from": "//miot/widget/Navbar" } },
        xml: "<div id='navbar'>\
			     <div id='left'>\
				    <a id='icon'><Close xmlns='//miot/assets'/></a>\
			     </div>\
			     <div id='title'>网关管理</div>\
			     <div id='right'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
        }
    },
    Content: {
        css: "#content { text-align: center; margin: 5em 0; }",
        xml: "<div class='page'>\
                <div id='content' class='page-content'/>\
              </div>",
        fun: function (sys, items, opts) {
            return { text: sys.content.text };
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}