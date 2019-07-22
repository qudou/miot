/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("6c610b08-85e9-4706-a6b3-3221bf5bc1f7", (xp, $_, t) => { //sysinfo

let QueryData = {};

$_().imports({
    Client: {
        xml: "<div id='client'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
                <label id='label'></label>\
              </div>",
        fun: function (sys, items, opts) {
            items.navbar.title(opts.name);
            QueryData = opts.queryData;
            QueryData.ln = parseInt(QueryData.ln);
            QueryData.col = parseInt(QueryData.col);
            console.log(opts);
            sys.label.text(JSON.stringify(opts));
            this.watch("options", (e, options) => {
                console.log(options);
            });
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
                    <div id='price'>66.66</div>\
                    <div id='name_'>品名</div>\
                    <div id='bcode'>货号</div>\
                    <button id='test'>下货</button>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            sys.test.on("click", e => {
                this.trigger("publish", ["drop-goods", {ln: QueryData.ln, col: QueryData.col}]);
            });
            this.watch("options", (e, o) => {
                let ln = QueryData.ln;
                let col = QueryData.col;
                let g = o.table[ln][col];
                sys.price.text(g["零售价"]);
                sys.name_.text(g["品名"]);
                sys.bcode.text(g["货号"]);
            });
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}