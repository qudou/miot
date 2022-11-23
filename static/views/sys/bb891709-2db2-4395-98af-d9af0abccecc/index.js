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
                <i:Navbar id='navbar' title='系统状态' menu='刷新'/>\
                <Content id='content'/>\
              </i:Applet>",
        fun: function (sys, items, opts) { 
            sys.navbar.on("iconClick", e => this.trigger("close"));
            sys.navbar.on("menuClick", ()=> this.trigger("publish", "/status"));
            sys.navbar.trigger("menuClick"); 
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