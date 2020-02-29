/*!
 * index.js v1.0.0
 * https://github.com/qudou/musicbox
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("f2384144-a9cd-4eec-ab8c-4f566b37067f", (xp, $_, t) => {

let app = new Framework7();

$_().imports({
    Index: {
        xml: "<div id='index'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            items.navbar.title(opts.name);
            this.trigger("publish", "/ready");
        }
    },
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 10px; }\
              .ios .navbar #close { margin-right: 0; width: 22px; height: 22px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only' style='margin:auto;'>close</i>\
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
        css: "#vol { margin-top: 35px; }",
        xml: "<div id='content' class='page' xmlns:i='content'>\
                <div class='page-content'>\
                    <i:Player id='player'/>\
                </div>\
              </div>",
        map: { nofragment: true }
    }
});

$_("content").imports({
    Player: {
        css: "#toggle { margin: 10px auto; }",
        xml: "<div id='player' xmlns:i='player'>\
                <i:Toggle id='toggle'/>\
              </div>"
    }
});

$_("content/player").imports({
    Toggle: {
        css: "#toggle, #toggle > * { width: 64px; height: 64px; }\
              #toggle i { font-size: 64px; }",
        xml: "<ViewStack id='toggle'>\
                <i id='open' class='icon f7-icons ios-only'>play_round</i>\
                <i id='close' class='icon f7-icons ios-only'>pause_round</i>\
              </ViewStack>",
        fun: function (sys, items, opts) {
            let table = { open: "close", close: "open" };
            sys.toggle.on(Click, "./*[@id]", function () {
                sys.toggle.trigger("switch", table[this]);
                sys.toggle.trigger("publish", ["/ctrl", {stat: this+''}]);
            });
            this.watch("/ready", (e, data) => {
                sys.toggle.trigger("switch", table[data.stat ? 'open':'close']);
            });
        }
    },
    ViewStack: {
        xml: "<div id='viewstack'/>",
        fun: function (sys, items, opts) {
            var args, children = this.children(),
                table = children.call("hide").hash(),
                ptr = table[opts.index] || children[0];
            if (ptr) ptr = ptr.trigger("show", null, false).show();
            this.on("switch", function (e, to) {
                table = this.children().hash();
                if ( !table[to] || table[to] == ptr ) return;
                e.stopPropagation();
                args = [].slice.call(arguments).slice(2);
                ptr.trigger("hide", [to+''].concat(args)).hide();
                ptr = table[to].trigger("show", [ptr+''].concat(args), false).show();
            });
            return Object.defineProperty({}, "selected", { get: () => {return ptr}});
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}