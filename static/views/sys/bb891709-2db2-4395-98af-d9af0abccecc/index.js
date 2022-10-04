/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("bb891709-2db2-4395-98af-d9af0abccecc", (xp, $_) => { // 系统状态

$_().imports({
    Index: {
        xml: "<div id='index'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>"
    },
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 14px; }\
              .ios .navbar #close { margin-right: 0; padding-right: 10px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only'>xmark</i>\
                   </div>\
                   <div id='title' class='title'>系统状态</div>\
                   <div class='right'>\
                      <button id='refresh' class='button' style='border:none;'>刷新</button>\
                   </div>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on(Click, e => this.trigger("close"));
            sys.refresh.on(Click, ()=>{
                this.trigger("publish", "/status");
                this.trigger("publish", "/sessions")
            });
            sys.refresh.trigger(Click);
        }
    },
    Content: {
        xml: "<div id='content' class='page' xmlns:i='content'>\
                <div id='detail' class='page-content'>\
                    <div class='block-title'>当前用户</div>\
                    <i:Status id='status'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/status", items.status.render);
        }
    }
});

$_("content").imports({
    Status: {
        xml: "<div id='table' class='data-table card'>\
                <table xmlns:i='status'>\
                   <i:Header id='header'/>\
                   <tbody id='body'/>\
                </table>\
              </div>",
        fun: function (sys, items, opts) {
            function render(e, data) {
                sys.body.kids().call("remove");
                data.forEach(i => sys.body.append("status/Item", i));
            }
            return {render: render};
        }
    }
});

$_("content/status").imports({
    Header: {
        xml: "<thead id='header'><tr>\
                <th class='label-cell'>用户名</th>\
                <th class='label-cell'>客户端</th>\
                <th class='label-cell'>登录时间</th>\
              </tr></thead>"
    },
    Item: {
        xml: "<tr id='item'>\
                <td id='username' class='label-cell'/>\
                <td id='client_id' class='label-cell'/>\
                <td id='login_time' class='label-cell'/>\
              </tr>",
        fun: function (sys, items, opts) {
            sys.username.text(opts.username);
            sys.client_id.text(opts.client_id);
            sys.login_time.text(opts.login_time);
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}