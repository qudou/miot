/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("9dd8a38b-a406-4679-82d5-dd8b7e3a30b7", (xp, $_) => { // 授权管理

$_().imports({
    Index: {
        xml: "<i:ViewStack id='index' xmlns:i='//miot/widget'>\
                <Overview id='overview'/>\
                <Apps id='apps'/>\
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
    Apps: {
        xml: "<div id='apps' xmlns:i='apps'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, prev, data) => {
                if (!data) return;
                items.navbar(data);
                items.content(data);
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
                items.content(`${p}不存在,请先添加${p}`);
            });
            this.watch("/auths/users", (e, data) => {
                data.length ? this.trigger("publish", "/auths/areas") : this.trigger("goto", ["guide", "用户"]);
            });
            this.watch("/auths/areas", (e, data) => {
                data.length ? this.trigger("publish", "/auths/links") : this.trigger("goto", ["guide", "区域"]);
            });
            this.watch("/auths/links", (e, data) => { 
                data.length || this.trigger("goto", ["guide", "网关"]);
            });
            this.trigger("publish", "/auths/users");
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
			     <div id='title'>授权管理</div>\
			     <div id='right'/>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
        }
    },
    Content: {
        xml: "<div class='page'>\
                <div id='content' class='page-content' xmlns:i='users' style='padding-top: 44px;'>\
                   <i:List id='list'><Users id='users'/></i:List>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            let areas = {}, links = {};
            this.watch("/auths/areas", (e, data) => {
                data.map(i => areas[i.id] = i);
            });
            this.watch("/auths/links", (e, data) => {
                let area, list;
                data.length ? sys.list.show() : sys.list.hide();
                data.forEach(item => {
                    if (area != item.area) {
                        area = item.area;
                        sys.content.append("Title").text(areas[item.area].name);
                        list = sys.content.append("users/List");
                    }
                    list.append("links/Item").val().value = item;
                });
                links = {};
                data.map(i => links[i.id]=i);
            });
            this.on("apps", (e, linkId) => {
                let data = xp.extend({},links[linkId]);
                data.area = areas[data.area];
                data.user = items.users.getValue().id;
                this.trigger("goto", ["apps", data]);
            });
            this.watch("auth-change", (e, app) => {
                let payload = { user:items.users.getValue().id, app:app.id, auth:app.auth };
                this.trigger("publish", ["/auths/auth", payload]);
            });
        }
    },
    Users: {
        xml: "<Picker id='users' xmlns='users'/>",
        fun: function (sys, items, opts) {
            this.watch("/auths/users", (e, data) => {
                data.length ? sys.users.show().val().init(data) : sys.users.hide();
            });
            this.on("value-change", (e, value) => {
                this.notify("user-change", value);
            });
            return { getValue: items.users.getValue };
        }
    },
    Title: {
        xml: "<div class='block-title'/>"
    },
});

$_("overview/users").imports({
    List: {
        xml: "<div class='list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    Picker: {
        css: ".sheet-modal { z-index: 100000; }\
              #icon { width: 28px; height: 28px; border-radius: 6px; box-sizing: border-box; }",
        xml: "<li id='picker'>\
                  <div class='item-content item-input'>\
                    <div class='item-media'><i id='icon' class='icon icon-f7'><Icon/></i></div>\
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
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M939.904 821.333333a439.296 439.296 0 0 0-306.346667-317.994666 233.258667 233.258667 0 0 0 111.573334-198.869334c0-128.554667-104.576-233.173333-233.130667-233.173333S278.869333 175.914667 278.869333 304.469333a233.258667 233.258667 0 0 0 111.573334 198.869334 439.296 439.296 0 0 0-306.346667 317.994666 103.594667 103.594667 0 0 0 19.541333 89.088c21.034667 26.88 52.608 42.24 86.613334 42.24H833.706667a109.226667 109.226667 0 0 0 86.613333-42.24c20.138667-25.6 27.221333-58.069333 19.584-89.088zM330.069333 304.469333c0-100.352 81.621333-181.973333 181.930667-181.973333s181.930667 81.621333 181.930667 181.973333S612.352 486.4 512 486.4 330.069333 404.778667 330.069333 304.469333z m549.973334 574.421334a59.306667 59.306667 0 0 1-46.336 22.613333H190.250667a59.306667 59.306667 0 0 1-46.336-22.613333 52.096 52.096 0 0 1-10.154667-45.312C176.725333 659.328 332.245333 537.6 512 537.6s335.274667 121.728 378.197333 295.978667a52.053333 52.053333 0 0 1-10.154666 45.312z'/>\
              </svg>"
    }
});

$_("overview/links").imports({
    Item: {
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
                this.trigger("apps", opts.id);
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

$_("apps").imports({
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
            sys.icon.on(Click, e => this.trigger("back"));
            return function (p) {
                opts = p;
                sys.title.text(`${p.area.name}/${p.name}`);
            };
        }
    },
    Content: {
        xml: "<div class='page'>\
                <div id='content' class='page-content' style='padding-top: 44px;'>\
                  <List id='apps' xmlns='/overview/users'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/auths/apps", (e, data) => {
                sys.apps.kids().call("remove");
                data.forEach(item => {
                    sys.apps.append("Item").val().value = item;
                });
            });
            this.on("update", (e, data) => {
                let item = xp.extend({}, data);
                item.link = opts;
                this.trigger("goto", ["update", item]);
            });
            return function (p) {
                opts = p;
                sys.content.trigger("publish", ["/auths/apps", {user: p.user, link: p.id}]);
            };
        }
    },
    Item: {
        css: "#icon { width: 28px; height: 28px; border-radius: 6px; box-sizing: border-box; }",
        xml: "<li>\
               <label class='item-checkbox item-content'>\
                 <input id='input' type='checkbox'/>\
                 <i class='icon icon-checkbox'/>\
                 <div class='item-inner'>\
                   <div id='label' class='item-title'/>\
                 </div>\
               </label>\
              </li>",
        fun: function (sys, items, opts) {
            function setValue(app) {
                opts = app;
                sys.label.text(app.name);
                sys.input.prop("checked", !!app.auth);
            }
            sys.input.on("change", (e) => {
                opts.auth = sys.input.prop("checked");
                this.notify("auth-change", opts);
            });
            return Object.defineProperty({}, "value", { set: setValue});
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M921.6 435.2H896V326.4c0-57.6-44.8-102.4-102.4-102.4H204.8c-12.8 0-25.6-12.8-25.6-25.6V76.8H102.4v121.6c0 57.6 44.8 102.4 102.4 102.4h588.8c12.8 0 25.6 12.8 25.6 25.6v108.8H102.4C44.8 435.2 0 480 0 531.2v320c0 57.6 44.8 102.4 102.4 102.4h819.2c57.6 0 102.4-44.8 102.4-102.4v-320c0-51.2-44.8-96-102.4-96z m25.6 416c0 12.8-12.8 25.6-25.6 25.6H102.4c-12.8 0-25.6-12.8-25.6-25.6v-320c0-12.8 12.8-25.6 25.6-25.6h819.2c12.8 0 25.6 12.8 25.6 25.6v320zM147.2 620.8h76.8V704H147.2V620.8z m153.6 0h76.8V704H300.8V620.8z m153.6 0h76.8V704H454.4V620.8z m416 44.8c0 19.2-19.2 38.4-38.4 38.4h-51.2c-19.2 0-38.4-19.2-38.4-38.4s19.2-38.4 38.4-38.4h51.2c19.2-6.4 38.4 12.8 38.4 38.4z'/>\
              </svg>"
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
            return sys.content.text;
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}