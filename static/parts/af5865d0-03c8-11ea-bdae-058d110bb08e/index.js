/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("af5865d0-03c8-11ea-bdae-058d110bb08e", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<div id='index'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
                <Tabbar id='tabbar'/>\
              </div>",
        fun: function (sys, items, opts) {
            sys.tabbar.on("tab-change", e => sys.content.trigger("switch", e.target));
        }
    },
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 14px; }\
              .ios .navbar #close { margin-right: 0; padding-right: 10px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only'>close</i>\
                   </div>\
                   <div id='title' class='title'>内部采购</div>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on(Click, e => this.trigger("close"));
        }
    },
    Content: {
        xml: "<ViewStack id='content' xmlns='//miot' xmlns:k='content'>\
                <k:Cart id='cart'/>\
                <k:Goods id='goods'/>\
              </ViewStack>"
    },
    Tabbar: {
        css: "#tabbar { position: fixed; }",
        xml: "<div id='tabbar' class='toolbar tabbar tabbar-labels toolbar-bottom'>\
                <div class='toolbar-inner'>\
                  <TabItem id='cart' label='购物车' icon='list' active='true'/>\
                  <TabItem id='goods' label='商品' icon='data'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            let table = {cart:"goods", goods:"cart"};
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

$_("content").imports({
    Goods: {
        css: "#goods > div {height: calc(100% - 50px);}\
              #wrap { height: calc(100% - 86px); overflow: auto; }",
        xml: "<div id='goods' class='page'>\
                <div class='page-content'>\
                  <Types id='types' xmlns='goods'/>\
                  <div id='wrap'>\
                    <List id='list'/>\
                  </div>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/type/goods", (e, data) => {
                sys.list.children().call("remove");
                data.forEach(item => {
                    sys.list.append("GoodItem").value().setValue(item);
                });
            });
            this.watch("cart-change", (e, data) => {
                let list = sys.list.children();
                list.forEach(item => {
                    let value = item.value().getValue();
                    value.id == data.id && item.value().setValue(data);
                });
            });
        }
    },
    Cart: {
        css: "#cart > div { height: calc(100% - 50px); }",
        xml: "<div id='cart' class='page'>\
                <div class='page-content'>\
                  <List id='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/cart/goods", (e, data) => {
                data.forEach(item => {
                    if (item.数量 > 0)
                        sys.list.append("CartItem").value().setValue(item);
                });
            });
            this.watch("add-to-cart", (e, data) => {
                let tmp, list = sys.list.children();
                list.forEach(item => {
                    let value = item.value().getValue();
                    value.id == data.id && (tmp = item);
                });
                if (tmp == null)
                    tmp = sys.list.append("CartItem");
                tmp.value().setValue(data);
            });
            this.trigger("publish", "/cart/goods");
        }
    },
    List: {
        xml: "<div id='list' class='list media-list'>\
                <ul id='p'/>\
              </div>",
        map: { appendTo: "p" }
    },
    GoodItem: {
        css: "#img { width: 80px; height: 80px; }",
        xml: "<li id='typeItem'>\
               <a href='#' class='item-link item-content'>\
                 <div class='item-media'><img id='img' width='80'/></div>\
                 <div class='item-inner'>\
                   <div class='item-title-row'>\
                     <div id='cname' class='item-title'/>\
                     <div id='price' class='item-after'/>\
                   </div>\
                   <div id='code' class='item-subtitle'/>\
                   <div class='item-row'>\
                     <Spinner id='spinner'/>\
                   </div>\
                 </div>\
               </a>\
              </li>",
        fun: function (sys, items, opts) {
            function setValue(item) {
                xp.extend(opts, item);
                sys.cname.text(`${opts.品名}`);
                sys.price.text(`¥${opts.零售价}`);
                sys.code.text(`${opts.货号}`);
                sys.img.attr("src", opts.图片);
                items.spinner(opts.数量);
            }
            function getValue() {
                return opts;
            }
            sys.spinner.on("change", () => {
                opts.数量 = items.spinner();
                let payload = {quantity: opts.数量, id: opts.id};
                this.trigger("publish", ["/qty/change", payload]);
                this.notify("add-to-cart", opts);
            });
            return { setValue: setValue, getValue: getValue };
        }
    },
    CartItem: {
        css: "#img { width: 80px; height: 80px; }\
              #label { padding-top: 2px; }",
        xml: "<li class='swipeout'>\
                <div class='item-content swipeout-content'>\
                  <div class='item-media'><img id='img' width='80'/></div>\
                  <div class='item-inner'>\
                    <div class='item-title-row'>\
                      <div id='cname' class='item-title'/>\
                      <div id='price' class='item-after'/>\
                    </div>\
                    <div id='code' class='item-subtitle'/>\
                    <div class='item-row'>\
                      <span id='label'>数量：</span><Spinner id='spinner'/>\
                    </div>\
                  </div>\
                </div>\
                <div class='swipeout-actions-right'>\
                  <a id='remove' href='#' class='color-red'>删除</a>\
                </div>\
              </li>",
        fun: function (sys, items, opts) {
            function setValue(item) {
                xp.extend(opts, item);
                sys.cname.text(`${opts.品名}`);
                sys.price.text(`¥${opts.零售价}`);
                sys.code.text(`${opts.货号}`);
                sys.img.attr("src", opts.图片);
                items.spinner(opts.数量);
            }
            function getValue() {
                return opts;
            }
            sys.spinner.on("change", () => {
                opts.数量 = items.spinner();
                let payload = {quantity: opts.数量, id: opts.id};
                this.trigger("publish", ["/qty/change", payload]);
                this.notify("cart-change", opts);
            });
            sys.remove.on(Click, () => {
                window.app.dialog.confirm("确定删除该商品吗？", "温馨提示", () => {
                    opts.数量 = 0;
                    this.trigger("publish", ["/remove", {id: opts.id}]);
                    this.glance("/remove", (m, p) => {
                        p.code == 0 && this.notify("cart-change", opts).remove();
                    });
                });
            });
            return { setValue: setValue, getValue: getValue };
        }
    },
    Spinner: {
        css: "#input span { display: block; text-align: center; float: right; }\
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

$_("content/goods").imports({
    Types: {
        xml: "<div class='list media-list' style='margin-bottom: 0'>\
                <ul><Picker id='picker'/></ul>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/types", (e, data) => {
                items.picker.init(data);
            });
            this.on("value-change", (e, value) => {
                let payload = {tid: value.id};
                this.trigger("publish", ["/type/goods", payload]);
            });
            this.trigger("publish", "/types");
            return { getValue: items.picker.getValue };
        }
    },
    Picker: {
        css: ".sheet-modal { z-index: 100000; }",
        xml: "<li id='picker'>\
                  <div class='item-content item-input'>\
                    <div class='item-media'><i class='f7-icons' style='color:gray;padding-top:3px;'>more_round</i></div>\
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

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}