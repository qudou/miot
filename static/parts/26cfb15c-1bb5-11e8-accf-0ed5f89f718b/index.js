/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("26cfb15c-1bb5-11e8-accf-0ed5f89f718b", (xp, $_, t) => { //sysinfo

let app = new Framework7({dialog:{buttonOk: '确定', buttonCancel: "取消"}});

$_().imports({
    Client: {
        xml: "<div id='client'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            items.navbar.title(opts.name);
            this.notify("options", opts.data);
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
                   <div id='title' class='title'/>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on("touchend", e => this.trigger("close"));
            return { title: sys.title.text };
        }
    },
    Content: {
        css: "#content .page-content div { margin-left: 15px; margin-right: 15px; }",
        xml: "<div id='content' class='page'>\
                <div class='page-content'>\
                    <div class='block-title'>系统信息</div>\
                    <div>更新时间：<span id='dateTime'/></div>\
                    <div>　制造商：<span id='manufacturer'/></div>\
                    <div>　　品牌：<span id='brand'/></div>\
                    <div>　ＣＰＵ：<span id='temp'/></div>\
                    <div>磁盘容量：<span id='diskspace'/></div>\
                    <Reboot id='reboot'/>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            this.watch("options", (e, data) => {
                for(let key in items)
                    data[key] && sys[key].text(data[key]);
            });
        }
    },
    Reboot: {
        xml: "<div class='list inset'>\
                <ul><li><a href='#' class='list-button item-link color-red'>重启</a></li></ul>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("touchend", e => {
                app.dialog.confirm("确定重启系统吗？", "温馨提示", e => {
                    this.trigger("publish", ["reboot", {}]);
                });
            });
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}