/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("760c6da2-a37b-4278-a9f5-7b4b54f523e5", (xp, $_) => { // 区域管理

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
            this.trigger("publish", "/areas/select");
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
                <i:Navbar id='navbar' title='区域注册'/>\
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
                <i:Navbar id='navbar' title='区域修改'/>\
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
                window.app.dialog.confirm("确定删除该区域吗？", "温馨提示", () => {
                    this.trigger("publish", ["/areas/remove", {id: p.id}]);
                    this.glance("/areas/remove", (m, p) => {
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
        xml: "<div id='navbar' xmlns:i='//miot/assets'>\
			     <div id='left'>\
				    <a id='icon'><i:Close/></a>\
			     </div>\
			     <div id='title'>区域管理</div>\
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
        xml: "<div id='content' class='page'>\
                <div class='page-content' style='padding-top: 44px;'>\
                  <AreaList id='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/areas/select", (e, data) => {
                sys.list.kids().call("remove");
                data.forEach(item => {
                    let area = sys.list.append("AreaItem").val();
                    area.value = item;
                });
                data.length ? sys.list.show() : sys.list.hide();
            });
            this.watch("/areas/remove", (e, p) => {
                sys.list.kids().length || sys.list.hide();
            });
        }
    },
    AreaList: {
        xml: "<div class='list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    AreaItem: {
        css: "#icon { width: 28px; height: 28px; border-radius: 6px; box-sizing: border-box; }",
        xml: "<li class='swipeout deleted-callback'>\
               <div class='item-content swipeout-content'>\
                 <div class='item-media'><i id='icon' class='icon icon-f7'><Icon/></i></div>\
                 <div class='item-inner'>\
                   <div id='label' class='item-title'>Swipe left on me please</div>\
                 </div>\
               </div>\
               <div class='swipeout-actions-right'>\
                 <a id='edit' href='#' class='color-blue'>编辑</a>\
                 <a id='remove' href='#' class='color-red'>删除</a>\
               </div>\
              </li>",
        fun: function (sys, items, opts) {
            sys.edit.on(Click, e => this.trigger("goto", ["update", opts]));
            function setValue(area) {
                opts = area;
                sys.label.text(area.name);
            }
            sys.remove.on(Click, () => this.notify("remove", opts));
            return Object.defineProperty({}, "value", { set: setValue});
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M309.474912 719.986985c26.89658 0 48.695049-21.798469 48.695049-48.646953l-49.715285-264.667915c0-26.920116-21.798469-48.767703-48.695049-48.767703L136.249639 357.904413c-26.89658 0-48.646953 21.847587-48.646953 48.767703l49.715285 264.667915c0 26.848485 21.750373 48.646953 48.646953 48.646953L309.474912 719.986985z' p-id='6348'></path><path d='M591.985194 719.986985c26.89658 0 48.646953-21.798469 48.646953-48.646953l49.714262-476.756311c0-26.89658-21.750373-48.719608-48.646953-48.719608L418.711825 145.864112c-26.847461 0-48.744167 21.823028-48.744167 48.719608l49.715285 476.756311c0 26.848485 21.895683 48.646953 48.743144 48.646953L591.985194 719.986985z' p-id='6349'></path><path d='M874.446357 719.986985c26.89658 0 48.744167-21.798469 48.744167-48.646953L923.190525 547.709293c0-26.921139-21.847587-48.743144-48.744167-48.743144l-73.844845 0c-26.846438 0-35.634592 15.730263-48.694025 48.743144l-49.715285 123.630738c0 26.848485 21.847587 48.646953 48.695049 48.646953L874.446357 719.986985z' p-id='6350'></path><path d='M913.139611 773.779122 146.930909 773.779122c-12.720719 0-23.206538 10.414187-23.206538 23.231097 0 12.792351 18.157545 53.550637 30.974455 53.550637l758.440785-30.271444c12.769838 0 23.25668-10.486842 23.25668-23.279193C936.395268 784.193309 925.908426 773.779122 913.139611 773.779122z'/>\
              </svg>"
    }
});

$_("signup").imports({
    Navbar: {
        map: { extend: { "from": "//miot/widget/Navbar" } },
        xml: "<div id='navbar' xmlns:i='//miot/assets'>\
			     <div id='left'>\
				    <a id='icon'><i:Backward/></a>\
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
                      <i:Area id='area'/>\
                      <i:Desc id='desc'/>\
                    </i:Form>\
                    <i:Button id='submit'>注册</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.desc.on("next", (e, p) => {
                e.stopPropagation();
                this.trigger("goto", "service");
                this.trigger("publish", ["/areas/signup", p]);
                this.glance("/areas/signup", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
				e.target.trigger("back", true);
                p.code || e.target.trigger("publish", "/areas/select");
            }
			sys.submit.on(Click, items.signup.start);
            return function () {
                items.area.val("");
                items.desc.val("").focus();
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
    Area: {
        xml: "<Input id='area' label='名称' placeholder='请输入区域名称' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.area.focus();
                sys.area.trigger("message", ["error", msg]);
            }
            this.on("start", (e, o) => {
                o.name = items.area.val();
                if (o.name === "") {
                    error("请输入区域名称");
                } else if (o.name.length < 2) {
                    error("区域名至少需要2个字符");
                } else {
                    this.trigger("next", o);
                }
            });
            return items.area;
        }
    },
    Desc: {
        xml: "<Input id='desc' label='描述' placeholder='描述是可选的' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.on("start", (e, o) => {
                o.desc = items.desc.val();
                this.trigger("next", o);
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
		map: { attrs: { text: "name value type maxlength placeholder disabled" } },
		fun: function (sys, items, opts) { 
            sys.label.text(opts.label);
			function focus() {
				sys.text.elem().focus();
				return this;
			}
			function val(value) {
				if (value == undefined)
					return sys.text.prop("value");
				sys.text.prop("value", value);
				return this;
			}
			return {val: val, focus: focus};
		}
	}
});

$_("update").imports({
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='../signup/form' style='padding-top: 44px;'>\
                    <i:Form id='update'>\
                      <i:Area id='area'/>\
                      <i:Desc id='desc'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定更新</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.desc.on("next", (e) => {
                e.stopPropagation();
                let p = {id:opts.id, name:items.area.val(),desc:items.desc.val()};
                this.trigger("goto", "service");
                this.trigger("publish", ["/areas/update", p]);
                this.glance("/areas/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
				e.target.trigger("back");
                p.code || e.target.trigger("publish", "/areas/select");
            }
			sys.submit.on(Click, items.update.start);
            return function (value) {
                opts = value;
                items.area.val(value.name);
                items.desc.val(value.desc);
            };
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}