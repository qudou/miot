/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("038ea3f0-163c-11ea-86cf-cdddba579d56", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<i:ViewStack id='index' xmlns:i='//miot'>\
                <Main id='main'/>\
                <Details id='details'/>\
                <Signup id='signup'/>\
                <Update id='update'/>\
                <Service id='service'/>\
              </i:ViewStack>"
    },
    Main: {
        xml: "<div id='main' xmlns:i='main'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
                <i:Tabbar id='tabbar'/>\
              </div>",
        fun: function (sys, items, opts) {
            sys.tabbar.on("tab-change", e => sys.content.trigger("switch", e.target));
        }
    },
    Details: {
        xml: "<div id='details' xmlns:i='details'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            let stores = {};
            this.watch("/stores", (e, data) => {
                data.forEach(i => stores[i.id] = i.name)
            });
            this.on("show", (e,to,data) => {
                let text = `${stores[data.store]} [${data.createtime}]`;
                items.navbar(text);
            });
        }
    },
    Signup: {
        xml: "<div id='signup' xmlns:i='signup'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Update: {
        xml: "<div id='update' xmlns:i='update'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, ptr, data) => {
                data && items.content.val(data);
            });
        }
    },
    Service: {
        css: "#service { visibility: visible; opacity: 1; background: #EFEFF4; }",
        xml: "<Overlay id='service' xmlns='//miot/verify'/>"
    }
});

$_("main").imports({
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 14px; }\
              .ios .navbar #close { margin-right: 0; padding-right: 10px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only'>close</i>\
                   </div>\
                   <div id='title' class='title'>采购后台</div>\
                   <div class='right'>\
                      <button id='signup' class='button' style='border:none;'>新增</button>\
                   </div>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on(Click, e => this.trigger("close"));
            sys.signup.on(Click, e => this.trigger("switch", "signup"));
        }
    },
    Content: {
        xml: "<ViewStack id='content' xmlns='//miot' xmlns:i='content'>\
                <i:Orders id='orders'/>\
                <i:Manager id='manager'/>\
              </ViewStack>"
    },
    Tabbar: {
        css: "#tabbar { position: fixed; }",
        xml: "<div id='tabbar' class='toolbar tabbar tabbar-labels toolbar-bottom'>\
                <div class='toolbar-inner'>\
                  <TabItem id='orders' label='订单' icon='data' active='true'/>\
                  <TabItem id='manager' label='管理' icon='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            let table = {manager:"orders", orders:"manager"};
            sys.tabbar.on("tab-change", e => {
                items[e.target].active();
                items[table[e.target]].unactive();
            });
        }
    },
    TabItem: {
        xml: "<a id='tabitem' href='#' class='tab-link'>\
                <i id='icon' class='icon f7-icons'>cloud_fill</i>\
                <span id='label' class='tabbar-label'>Upload</span>\
              </a>",
        fun: function (sys, items, opts) {
            sys.label.text(opts.label);
            opts.active && active();
            sys.icon.text(opts.icon);
            this.on(Click, () => this.trigger("tab-change"));
            function active() {
                sys.tabitem.addClass("tab-link-active");
            }
            function unactive() {
                sys.tabitem.removeClass("tab-link-active");
            }
            return { active: active, unactive: unactive };
        }
    }
});

$_("main/content").imports({
    Orders: {
        css: "#orders > div { height: calc(100% - 50px); }",
        xml: "<div id='orders' class='page'>\
                <div class='page-content' xmlns:i='orders'>\
                  <i:Stores id='stores'/>\
                  <i:List id='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/orders", (e, data) => {
                sys.list.children().call("remove");
                data.forEach(item => {
                    sys.list.append("orders/Item").value().setValue(item);
                });
            });
        }
    },
    Manager: {
        css: "#manager > div { height: calc(100% - 50px); }\
              #wrap { height: calc(100% - 86px); overflow: auto; }",
        xml: "<div id='manager' class='page'>\
                <div class='page-content' xmlns:i='manager'>\
                  <i:Types id='types'/>\
                  <div id='wrap'>\
                    <i:List id='list'/>\
                  </div>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("type-goods", (e, type) => {
                items.types.setValue(type);
            });
            this.watch("/type/goods", (e, data) => {
                sys.list.children().call("remove");
                data.forEach(item => {
                    sys.list.append("manager/Item").value().setValue(item);
                });
            });
        }
    }
});

$_("main/content/orders").imports({
    List: {
        xml: "<div class='list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    Item: {
        xml: "<li id='orderItem'>\
               <a href='#' class='item-link item-content'>\
                 <div class='item-media'><i class='f7-icons' style='color:gray'>layers</i></div>\
                 <div id='time' class='item-inner'>\
                    <div id='createtime' class='item-title'/>\
                 </div>\
               </a>\
              </li>",
        fun: function (sys, items, opts) {
            function setValue(data) {
                opts = data;
                sys.createtime.text(data.createtime);
            }
            this.on(Click, () => {
                payload = {oid: opts.id};
                this.trigger("switch", ["details",opts]);
                this.trigger("publish", ["/details", payload]);
            });
            return { setValue: setValue};
        }
    },
    Stores: {
        xml: "<List id='stores'>\
                <Picker id='picker'/>\
              </List>",
        fun: function (sys, items, opts) {
            this.watch("/stores", (e, data) => {
                items.picker.init(data);
            });
            this.on("value-change", (e, value) => {
                let payload = {sid: value.id};
                this.trigger("publish", ["/orders", payload]);
            });
            this.trigger("publish", "/stores");
            return { getValue: items.picker.getValue };
        }
    },
    Picker: {
        css: ".sheet-modal { z-index: 100000; }",
        xml: "<li id='picker'>\
                  <div class='item-content item-input'>\
                    <div class='item-media'><i class='f7-icons' style='color:gray'>home</i></div>\
                    <div class='item-inner'>\
                      <div class='item-input-wrap'>\
                        <input id='input' type='text' readonly='readonly'/>\
                      </div>\
                      <div id='id' class='item-footer'/>\
                    </div>\
                  </div>\
              </li>",
        fun: function (sys, items, opts) {
            let picker, table = {};
            function init(data) {
                data.map(i=>table[i.name]=i);
                let array = Object.keys(table);
                picker && picker.destroy();
                picker = window.app.picker.create({
                    inputEl: sys.input.elem(),
                    rotateEffect: true,
                    toolbarCloseText: "确定",
                    cols: [{values: array, onChange: change}],
                    value: [array[0]]
                });
                setValue(data[0]);
            }
            function change(picker, value) {
                setTimeout(e => sys.picker.trigger("value-change", table[value]), 0);
            }
            function getValue() {
                return table[picker.value[0]];
            }
            function setValue(value) {
                opts.setid && sys.id.text(value.id);
                picker.setValue([value.name]);
                sys.picker.trigger("value-change", value);
            }
            return { init: init, getValue:getValue, setValue: setValue };
        }
    }
});

$_("details").imports({
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 10px; }\
              .ios .navbar #back { margin-right: 0; width: 22px; height: 22px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='backward' class='left'>\
                      <i class='icon f7-icons ios-only' style='margin:auto;'>chevron_left_round</i>\
                   </div>\
                   <div id='title' class='title'/>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.backward.on(Click, e => this.trigger("switch", "main"));
            return sys.title.text;
        }
    },
    Content: {
        xml: "<div id='detail' class='page'>\
                <div class='page-content'>\
                  <List id='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/details", (e, data) => {
                sys.list.children().call("remove");
                data.forEach(item => {
                    sys.list.append("Item").value().setValue(item);
                });
            });
        }
    },
    List: {
        xml: "<div class='list media-list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    Item: {
        css: "#img { width: 80px; height: 80px; }",
        xml: "<li id='detailItem'>\
               <div class='item-content'>\
                 <div class='item-media'><img id='img' width='80'/></div>\
                 <div class='item-inner'>\
                   <div class='item-title-row'>\
                     <div id='cname' class='item-title'/>\
                     <div id='price' class='item-after'/>\
                   </div>\
                   <div id='code' class='item-subtitle'/>\
                   <div class='item-row'>\
                      数量：<span id='num'/>\
                   </div>\
                 </div>\
               </div>\
              </li>",
        fun: function (sys, items, opts) {
            function setValue(item) {
                xp.extend(opts, item);
                sys.cname.text(`${opts.品名}`);
                sys.price.text(`¥${opts.零售价}`);
                sys.code.text(`${opts.货号}`);
                sys.img.attr("src", opts.图片);
                sys.num.text(`${opts.数量}${opts.单位}`);
            }
            return { setValue: setValue };
        }
    },
    Spinner: {
        css: "#input { width: 100px; }\
              #input span { display: block; height: 30px; padding-top: 6px; text-align: center; float: right; padding-top: 6px; }\
              #input em { display: block; width: 20px; height: 26px; float: left; background: #e1e1e1; line-height: 26px; cursor: pointer; -webkit-user-select: none; }\
              #input em:hover { color: #ff6a09; }\
              #text { width: 38px; display: block; height: 24px; float: left; border: 1px #b3b3b3 solid; line-height: 24px; text-align: right; padding: 0; }",
        xml: "<span id='input' class='item-after'>\
                <span>\
                    <em id='suba'>-</em>\
                    <input id='text' tabindex='24' class='xsm-order-list-shuru-input' value='0'/>\
                    <em id='adda'>+</em>\
                </span>\
              </span>",
        fun: function (sys, items, opts) {
            let t = sys.text;
            sys.suba.on(Click, e => {
                let n = text();
                t.trigger("change", n > 0 ? text(--n) : 0);
            });
            sys.adda.on(Click, e => {
                t.trigger("change", text(text() + 1));
            });
            function text(v) {
                return v !== undefined ? t.prop("value", v) : parseInt(t.prop("value"), 10);
            }
            sys.text.attr("desc", opts.desc);
            return text;
        }
    }
});

$_("main/content/manager").imports({
    Types: {
        xml: "<div class='list media-list' style='margin-bottom: 0'>\
                <ul><Picker id='picker' xmlns='../orders'/></ul>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/types", (e, data) => {
                items.picker.init(data);
            });
            this.on("value-change", (e, value) => {
                let payload = {tid: value.id};
                this.trigger("publish", ["/type/goods", payload]);
                setTimeout(() => this.notify("type-change", value), 0);;
            });
            this.trigger("publish", "/types");
            return items.picker;
        }
    },
    List: {
        xml: "<div id='list' class='list media-list'>\
                <ul id='p'/>\
              </div>",
        map: { appendTo: "p" }
    },
    Item: {
        css: "#img { width: 80px; height: 80px; }\
              #label { padding-top: 2px; }",
        xml: "<li class='swipeout deleted-callback'>\
                <div class='item-content swipeout-content'>\
                  <div class='item-media'><img id='img' width='80'/></div>\
                  <div class='item-inner'>\
                    <div class='item-title-row'>\
                      <div id='cname' class='item-title'/>\
                      <div id='price' class='item-after'/>\
                    </div>\
                    <div id='code' class='item-subtitle'/>\
                  </div>\
                </div>\
                <div class='swipeout-actions-right'>\
                  <a id='edit' href='#' class='color-blue'>编辑</a>\
                  <a id='remove' href='#' class='color-red'>删除</a>\
                </div>\
              </li>",
        fun: function (sys, items, opts) {
            sys.edit.on(Click, () => this.trigger("switch", ["update", opts]));
            function setValue(item) {
                xp.extend(opts, item);
                sys.cname.text(`${opts.品名}`);
                sys.price.text(`¥${opts.零售价}`);
                sys.code.text(`${opts.货号}`);
                sys.img.attr("src", opts.图片);
            }
            function getValue() {
                return opts;
            }
            sys.remove.on(Click, () => {
                window.app.dialog.confirm("确定删除该商品吗？", "温馨提示", () => {
                    this.trigger("publish", ["/manager/remove", {id: opts.id}]);
                    this.glance("/manager/remove", (m, p) => {
                        p.code == 0 && this.remove();
                    });
                });
            });
            return { setValue: setValue, getValue: getValue };
        }
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
                   <div id='title' class='title'>商品新增</div>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.backward.on(Click, e => this.trigger("switch", "main"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='/update/form'>\
                    <i:Form id='signup'>\
                      <i:Code id='code'/>\
                      <i:Name id='gname'/>\
                      <i:Type id='type'/>\
                      <i:Unit id='unit'/>\
                      <i:Price id='price'/>\
                      <i:Picture id='picture'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定新增</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.submit.on(Click, items.signup.start);
            this.watch("type-change", (e, type) => {
                items.type.setValue(type.id);
            });
            sys.picture.on("next", (e, p) => {
                e.stopPropagation();
                this.trigger("switch", "service");
                this.trigger("publish", ["/signup", p]);
                this.glance("/signup", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                if (p.code == -1)
                    return e.target.trigger("switch", "signup");
                let type = items.type.getValue();
                e.target.notify("type-goods", type).trigger("switch", "main");
            }
        }
    }
});

$_("update").imports({
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 10px; }\
              .ios .navbar #back { margin-right: 0; width: 22px; height: 22px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='backward' class='left'>\
                      <i class='icon f7-icons ios-only' style='margin:auto;'>chevron_left_round</i>\
                   </div>\
                   <div id='title' class='title'>商品修改</div>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.backward.on(Click, e => this.trigger("switch", "main"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='form'>\
                    <i:Form id='update'>\
                      <i:Code id='code'/>\
                      <i:Name id='gname'/>\
                      <i:Type id='type'/>\
                      <i:Unit id='unit'/>\
                      <i:Price id='price'/>\
                      <i:Picture id='picture'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定更新</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.submit.on(Click, items.update.start);
            function val(value) {
                opts = value;
                items.code.val(value.货号);
                items.gname.val(value.品名);
                items.type.setValue(value.分类);
                items.unit.val(value.单位);
                items.price.val(value.零售价);
                items.picture.val(value.图片);
            }
            sys.picture.on("next", (e, p) => {
                e.stopPropagation();
                p.id = opts.id;
                this.trigger("switch", "service");
                this.trigger("publish", ["/update", p]);
                this.glance("/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                if (p.code == -1)
                    return e.target.trigger("switch", "update");
                let type = items.type.getValue();
                e.target.notify("type-goods", type).trigger("switch", "main");
            }
            return {val: val};
        }
    }
});

$_("update/form").imports({
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
    Code: {
        xml: "<Input id='code' label='货号' placeholder='请输入货号' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.code.focus();
                sys.code.trigger("message", ["error", msg]);
            }
            this.on("start", (e, o) => {
                o.货号 = items.code.val();
                if (o.name === "") {
                    error("请输入货号");
                } else {
                    sys.code.trigger("next", o);
                }
            });
            return items.code;
        }
    },
	Name: {
		xml: "<Input id='gname' label='品名' placeholder='请输入品名' maxlength='32'/>",
		fun: function (sys, items, opts) {
			function error(msg) {
				items.gname.focus();
				sys.gname.trigger("message", ["error", msg]);
			}
			this.on("start", function (e, o) {
				o.品名 = items.gname.val();
				if (o.品名 == "") {
					error("请输入品名");
				} else {
					sys.gname.trigger("next", o);
				}
			});
			return items.gname;
		}
	},
    Type: {
        xml: "<Picker id='type' label='分类'/>",
        fun: function (sys, items, opts) {
            let table = {};
            this.watch("/types", (e, data) => {
                data.map(i=>table[i.id]=i);
                items.type.init(data);
            });
            this.on("start", (e, p) => {
                p.分类 = items.type.getValue().id;
                this.trigger("next", p);
            });
            function setValue(typeId) {
                items.type.setValue(table[typeId]);
            }
            return { getValue: items.type.getValue, setValue: setValue };
        }
    },
	Unit: {
		xml: "<Input id='unit' label='单位' placeholder='请输入单位' maxlength='32'/>",
		fun: function (sys, items, opts) {
			function error(msg) {
				items.unit.focus();
				sys.unit.trigger("message", ["error", msg]);
			}
			this.on("start", function (e, o) {
				o.单位 = items.unit.val();
				if (o.单位 == "") {
					error("请输入单位");
				} else {
					sys.unit.trigger("next", o);
				}
			});
			return items.unit;
		}
	},
    Price: {
        xml: "<Input id='price' label='售价' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.on("start", (e, p) => {
                p.零售价 = parseFloat(items.price.val());
                this.trigger("next", p);
            });
            return items.price;
        }
    },
    Picture: {
        xml: "<Input id='picture' label='图片'/>",
        fun: function (sys, items, opts) {
            this.on("start", (e, p) => {
                p.图片 = items.picture.val();
                this.trigger("next", p);
            });
            return items.picture;
        }
    },
    Picker: {
        css: ".sheet-modal { z-index: 100000; }",
        xml: "<li id='picker'>\
                  <div class='item-content item-input'>\
                    <div class='item-inner'>\
                      <div id='label' class='item-title item-label'/>\
                      <div class='item-input-wrap'>\
                        <input id='input' type='text' readonly='readonly'/>\
                      </div>\
                      <div id='id' class='item-footer'/>\
                    </div>\
                  </div>\
              </li>",
        fun: function (sys, items, opts) {
            let picker, table = {};
            sys.label.text(opts.label);
            function init(data) {
                data.map(i=>table[i.name]=i);
                let array = Object.keys(table);
                picker && picker.destroy();
                picker = window.app.picker.create({
                    inputEl: sys.input.elem(),
                    rotateEffect: true,
                    toolbarCloseText: "确定",
                    cols: [{values: array, onChange: change}],
                    value: [array[0]]
                });
                setValue(data[0]);
            }
            function change(picker, value) {
                setTimeout(e => setValue(table[value]), 0);
            }
            function getValue() {
                return table[picker.value[0]];
            }
            function setValue(value) {
                opts.setid && sys.id.text(value.id);
                picker.setValue([value.name]);
                sys.picker.trigger("value-change", value);
            }
            return { init: init, getValue:getValue, setValue: setValue };
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
		map: { attrs: { text: "name value type maxlength placeholder disabled" } },
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

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}