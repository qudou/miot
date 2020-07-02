/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("1998ca30-b88b-11ea-af62-5774c5bf49f5", (xp, $_) => { //报警器

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
                   <div id='title' class='title'>报警器</div>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on(Click, e => this.trigger("close"));
            return { title: sys.title.text };
        }
    },
    Content: {
        css: "#content .page-content div { margin-left: 15px; margin-right: 15px; }",
        xml: "<div id='content' class='page'>\
                <div class='page-content'>\
                    <Button id='open'>布防</Button>\
                    <Button id='close'>撤防</Button>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            sys.open.on(Click, (e, data) => this.trigger("publish", "/bufang"));
            sys.close.on(Click, (e, data) => this.trigger("publish", "/chefang"));
        }
    },
    Button: {
        xml: "<div class='list inset'>\
               <ul><li>\
                <a id='label' href='#' class='list-button item-link color-red'/>\
               </li></ul>\
              </div>",
        map: { appendTo: "label" }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}