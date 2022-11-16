/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("bb891709-2db2-4395-98af-d9af0abccecc", (xp, $_) => { // 系统状态

$_().imports({
    Index: {
        xml: "<i:Applet xmlns:i='//xp'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </i:Applet>"
    },
    Navbar: {
        xml: "<div id='navbar' xmlns:i='//xp/assets'>\
                 <div id='left'>\
                    <a id='icon'><i:Close/></a>\
                 </div>\
                 <div id='title'>系统状态</div>\
                 <div id='right'>\
                    <a id='menu' href='#'>刷新</a>\
                 </div>\
              </div>",
        map: { extend: { "from": "//xp/Navbar" } },
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
            sys.menu.on(Click, ()=> this.trigger("publish", "/status"));
            sys.menu.trigger(Click); 
        }
    },
    Content: {
        xml: "<i:Content id='content' xmlns:i='//xp' xmlns:j='content'>\
                 <Title xmlns='//xp/block'>当前用户</Title>\
                 <j:Status id='status'/>\
              </i:Content>"
    }
});

$_("content").imports({
    Status: {
        xml: "<Table id='table' card='1' xmlns='//xp' xmlns:i='status'>\
               <i:Header id='header'/>\
               <tbody id='body'>\
                 <i:Item id='item'/>\
               </tbody>\
              </Table>",
        fun: function (sys, items, opts) {
            let proxy = sys.item.bind([]);
            this.watch("/status", (e, data) => proxy.model = data);
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
              </tr>"
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}