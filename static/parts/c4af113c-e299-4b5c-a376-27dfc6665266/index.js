/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("c4af113c-e299-4b5c-a376-27dfc6665266", (xp, $_, t) => { //sysinfo

$_().imports({
    Index: {
        xml: "<div id='index'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            console.log(opts);
            this.notify("data-change", opts.data);
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
                   <div id='title' class='title'>操作指南</div>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on("touchend", e => this.trigger("close"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div id='detail' class='page-content'>\
                    <h1>操作指南</h1>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            console.log("hello world!");
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}