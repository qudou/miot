/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("b414e216-52c5-4b18-8275-588c92a1f38b", (xp, $_) => { // 应用管理

$_().imports({
    Index: {
        xml: "<i:ViewStack id='index' xmlns:i='//miot'>\
                <Overview id='overview'/>\
                <PartList id='partlist'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
                <Service id='service'/>\
                <Guide id='guide'/>\
              </i:ViewStack>",
        fun: function (sys, items, opts) {
            items.overview.title(opts.name);
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
    PartList: {
        xml: "<div id='partlist' xmlns:i='partlist'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, to, p) => {
                if (!p) return;
                items.navbar.init(p);
                items.content.init(p);
            });
        }
    },
    Signup: {
        xml: "<div id='signup' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='应用注册'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e,to,p) => p && items.content.init(p));
        }
    },
    Update: {
        xml: "<div id='update' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='应用修改'/>\
                <Content id='content' xmlns='update'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e,to,p) => p && items.content.init(p));
        }
    },
    Remove: {
        fun: function (sys, items, opts) {
            this.watch("remove", (e, p) => {
                window.app.dialog.confirm("确定删除该应用吗？", "温馨提示", () => {
                    this.trigger("publish", ["/parts/remove", {id: p.id}]);
                    this.glance("/parts/remove", (m, p) => {
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
    },
    Guide: {
        xml: "<div id='guide' xmlns:i='guide'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            items.navbar.title("应用管理");
            this.on("show", (e, to, p) => {
                items.content.text(`${p}不存在,请先添加${p}`);
            });
            this.watch("/parts/areas", (e, data) => {
                data.length ? this.trigger("publish", "/parts/links") : this.trigger("switch", ["guide", "区域"]);
            });
            this.watch("/parts/links", (e, data) => {
                data.length ? this.trigger("publish", "/parts/views") : this.trigger("switch", ["guide", "网关"]);
            });
            this.watch("/parts/views", (e, data) => {
                data.length || this.trigger("switch", ["guide", "视图"]);
            });
        }
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
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on(Click, e => this.trigger("close"));
            return { title: sys.title.text };
        }
    },
    Content: {
        xml: "<div class='page'>\
                <div id='content' class='page-content'/>\
              </div>",
        fun: function (sys, items, opts) {
            let areas = {}, links = {}; 
            this.watch("/parts/areas", (e, data) => {
                data.map(i => areas[i.id] = i);
            });
            this.watch("/parts/links", (e, data) => {
                let area, list;
                data.forEach(item => {
                    if (area != item.area) {
                        area = item.area;
                        sys.content.append("Title").text(areas[item.area].name);
                        list = sys.content.append("LinkList");
                    }
                    list.append("LinkItem").value().value = item;
                });
                links = {};
                data.map(i => links[i.id]=i);
            });
            this.watch("partlist", (e, linkId) => {
                let data = xp.extend({},links[linkId]);
                data.area = areas[data.area];
                this.trigger("switch", ["partlist", data]);
            });
            this.trigger("publish", "/parts/areas");
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
        xml: "<li>\
               <a href='#' class='item-link item-content'>\
                 <div class='item-media'><i id='icon' class='icon icon-f7'><Icon/></i></div>\
                 <div class='item-inner'>\
                   <div id='label' class='item-title'/>\
                 </div>\
               </a>\
              </li>",
        fun: function (sys, items, opts) {
            function setValue(link) {
                opts = link;
                sys.label.text(link.name);
            }
            this.on(Click, (e) => {
                this.notify("partlist", opts.id);
            });
            return Object.defineProperty({}, "value", {set: setValue});
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M768 864H256c-70.4 0-128-57.6-128-128v-128c0-70.4 57.6-128 128-128h64V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h256V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h64c70.4 0 128 57.6 128 128v128c0 70.4-57.6 128-128 128z m64-256c0-35.2-28.8-64-64-64H256c-35.2 0-64 28.8-64 64v128c0 35.2 28.8 64 64 64h512c35.2 0 64-28.8 64-64v-128z m-160 128c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z m-320 96c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z'/>\
              </svg>"
    }
});

$_("partlist").imports({
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 10px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='backward' class='left'>\
                      <i class='icon f7-icons' style='margin:auto;'>chevron_left_round</i>\
                   </div>\
                   <div id='title' class='title'/>\
                   <div class='right'>\
                      <button id='signup' class='button' style='border:none;'>新增</button>\
                   </div>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            function init(p) {
                opts = p;
                sys.title.text(`${p.area.name}/${p.name}`);
            }
            sys.backward.on(Click, e => this.trigger("switch", "overview"));
            sys.signup.on(Click, e => this.trigger("switch", ["signup", opts]));
            return {init: init};
        }
    },
    Content: {
        xml: "<div class='page'>\
                <div id='content' class='page-content'>\
                  <PartList id='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            function init(p) {
                opts = p;
                sys.content.trigger("publish", ["/parts/parts", {link: p.id}]);
            }
            this.watch("/parts/parts", (e, data) => {
                sys.list.children().call("remove");
                data.forEach(item => {
                    sys.list.append("PartItem").value().value = item;
                });
                data.length ? sys.list.show() : sys.list.hide();
            });
            this.on("update", (e, data) => {
                let item = xp.extend({}, data);
                item.link = opts;
                this.trigger("switch", ["update", item]);
            });
            this.watch("/parts/remove", (e, p) => {
                sys.list.children().length || sys.list.hide();
            });
            return {init: init};
        }
    },
    PartList: {
        map: { extend: {'from': '../overview/LinkList'} }
    },
    PartItem: {
        css: "#icon { width: 28px; height: 28px; border-radius: 6px; box-sizing: border-box; }",
        xml: "<li class='swipeout'>\
               <div class='item-content swipeout-content'>\
                 <div class='item-media'><i id='icon' class='icon icon-f7'><Icon/></i></div>\
                 <div class='item-inner'>\
                   <div class='item-title'>\
                     <div id='label'/>\
                     <div id='part' class='item-footer'/>\
                   </div>\
                 </div>\
               </div>\
               <div class='swipeout-actions-right'>\
                 <a id='edit' href='#' class='color-blue'>编辑</a>\
                 <a id='remove' href='#' class='color-red'>删除</a>\
               </div>\
              </li>",
        fun: function (sys, items, opts) {
            sys.edit.on(Click, () => this.trigger("update", opts));
            function setValue(part) {
                opts = part;
                sys.label.text(part.name);
                sys.part.text(part.id);
            }
            sys.remove.on(Click, () => this.notify("remove", opts));
            return Object.defineProperty({}, "value", { set: setValue});
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
        css: ".ios .navbar-inner { padding: 0 10px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='backward' class='left'>\
                      <i class='icon f7-icons' style='margin:auto;'>chevron_left_round</i>\
                   </div>\
                   <div id='title' class='title'/>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.title.text(opts.title);
            sys.backward.on(Click, e => this.trigger("switch", "partlist"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='form'>\
                    <i:Form id='signup'>\
                      <i:Name id='nane'/>\
                      <i:Area id='area'/>\
                      <i:Link id='link'/>\
                      <i:Class id='klass'/>\
                      <i:Type id='type'/>\
                    </i:Form>\
                    <i:Button id='submit'>注册</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.submit.on(Click, items.signup.start);
            sys.type.on("next", (e, p) => {
                opts = p;
                e.stopPropagation();
                this.trigger("switch", "service");
                this.trigger("publish", ["/parts/signup", p]);
                this.glance("/parts/signup", callback);
            });
            function callback(e, p) {
                this.trigger("message", ["msg", p.desc]);
                if (p.code == -1)
                    return this.trigger("switch", "signup");
                this.notify("partlist", opts.link);
            }
            function init(p) {
                items.nane.val("").focus();
                items.area.setValue(p.area);
                items.link.setValue(p);
            }
            return {init: init};
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
                ptr.trigger("start", r, false);
            });
            function start() {
                ptr = first;
                ptr.trigger("start", {}, false);
            }
            return { start: start };
        }
    },
    Name: {
        xml: "<Input id='part' label='名称' placeholder='请输入应用名称' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.part.focus();
                sys.part.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.name = items.part.val();
                if (o.name === "") {
                    error("请输入应用名称");
                } else if (o.name.length < 2) {
                    error("应用名称至少需要2个字符");
                } else {
                    sys.part.trigger("next", o);
                }
            });
            return items.part;
        }
    },
    Area: {
        xml: "<Picker id='area' label='区域'/>",
        fun: function (sys, items, opts) {
            this.watch("/parts/areas", (e, data) => {
                data.length ? sys.area.show().value().init(data) : sys.area.hide();
            });
            this.on("value-change", (e, value) => {
                this.next().trigger("area-change", value, false);
            });
            this.on("start", (e, p) => this.trigger("next", p));
            return { setValue: items.area.setValue };
        }
    },
    Link: {
        xml: "<Picker id='link' label='网关' setid='1'/>",
        fun: function (sys, items, opts) {
            let links = {};
            this.watch("/parts/links", (e, data) => {
                data.map(i => {
                    links[i.area] = links[i.area] || [];
                    links[i.area].push(i);
                });
                this.on("area-change", (e, area) => items.link.init(links[area.id]));
            });
            this.on("start", (e, p) => {
                p.link = items.link.getValue().id;
                this.trigger("next", p);
            });
            return { setValue: items.link.setValue };
        }
    },
    PUID: {
        xml: "<Input id='part' label='配件标识符' placeholder='请输入配件标识符'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.part.focus();
                sys.part.trigger("message", ["error", msg]);
            }
            this.on("start", (e, o) => {
                o.part = items.part.val();
                if (o.part === "") {
                    error("请输入配件标识符");
                } else if (o.part.length != 36) {
                    error("配件标识符需要34个字符");
                } else {
                    sys.part.trigger("next", o);
                }
            });
            return items.part;
        }
    },
    View: {
        xml: "<Picker id='view' label='视图' setid='1'/>",
        fun: function (sys, items, opts) {
            let table = {}; 
            this.watch("/parts/views", (e, data) => {
                data.length && items.view.init(data);
                data.map(i=>table[i.id]=i);
            });
            this.on("start", (e, p) => {
                p.view = items.view.getValue().id;
                this.trigger("next", p);
            });
            function setValue(viewId) {
                items.view.setValue(table[viewId]);
            }
            return { setValue: setValue };
        }
    },
    Type: {
        xml: "<Picker id='type' label='类型'/>",
        fun: function (sys, items, opts) {
            let table = {}; 
            let data = [{id: 1, name: "无配件"},{id: 2, name: "有配件"}];
            items.type.init(data);
            data.map(i=>table[i.id]=i);
            this.on("start", (e, p) => {
                p.type = items.type.getValue().id;
                this.trigger("next", p);
            });
            function setValue(typeId) {
                items.type.setValue(table[typeId]);
            }
            return { setValue: setValue };
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
                     <input id='text' type='text' name='name' style='font-size: 14px;'/>\
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
                      <GUID id='guid'/>\
                      <i:Name id='nane'/>\
                      <i:Area id='area'/>\
                      <i:Link id='link'/>\
                      <i:PUID id='puid'/>\
                      <i:View id='view'/>\
                      <i:Type id='type'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定更新</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.submit.on(Click, items.update.start);
            sys.type.on("next", (e, p) => {
                opts = p;
                p.id = items.guid.val();
                e.stopPropagation();
                this.trigger("switch", "service");
                this.trigger("publish", ["/parts/update", p]);
                this.glance("/parts/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                if (p.code == -1)
                    return e.target.trigger("switch", "update");
                e.target.notify("partlist", opts.link);
            }
            function init(data) {
                items.guid.val(data.id);
                items.nane.val(data.name);
                items.area.setValue(data.link.area);
                items.link.setValue(data.link);
                items.puid.val(data.part);
                items.view.setValue(data.view);
                items.type.setValue(data.type);
            }
            return {init: init};
        }
    },
    GUID: {
        css: "#guid { font-size: 14px; }\
              #text { height: 44px; line-height: 44px; }",
		xml: "<li id='guid'>\
               <div class='item-content item-input'>\
                 <div class='item-inner'>\
                   <div id='label' class='item-title item-label'>应用标识符</div>\
                   <div class='item-input-wrap'>\
                     <div id='text'/>\
                   </div>\
                 </div>\
               </div>\
              </li>",
        fun: function (sys, items, opts) {
            this.on("start", (e, p) => {
                sys.guid.trigger("next", p);
            });
            return {val: sys.text.text};
        }
    }
});

$_("guide").imports({
    Navbar: {
        map: { extend: {from: "../overview/Navbar"} }
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