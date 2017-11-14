const ID = "59fc0ee0b352e3eb3d82c93f";

xmlplus(ID, function (xp, $_, t) {

$_().imports({
    Client: {
        css: "#client { margin: 0 16px 16px; }\
              #client button { width: 80px; text-align: center; margin: 10px; }",
        xml: "<div id='client' xmlns:i='client'>\
                <i:Header id='header'/>\
                <Button id='toggle' label='pl-toggle*'/>\
                <Button label='sh-reboot#'/>\
                <input id='vol' type='range'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("message", (e, data) => {
                items.header.title(data.name);
                sys.vol.prop("value", data.vol);
            });
            sys.toggle.on("touchend", e => {
                let payload = { key: e.target.text() };
                this.trigger("publish", ["control", payload]);
            });
            sys.vol.on("change", e => {
                let payload = { key: "pl-vol#", vol: sys.vol.prop("value") };
                this.trigger("publish", ["control", payload]);
            });
            this.trigger("publish", ["message"]);
        }
    },
    Button: {
        xml: "<button id='btn' class='btn btn-primary'/>",
        fun: function (sys, items, opts) {
            this.text(opts.label);
        }
    }
});

$_("client").imports({
    Header: {
        css: "#header { position: relative; margin: 0; height: 44px; line-height: 44px; text-align: center; box-sizing: border-box; }\
              #header:after { content: ''; position: absolute; left: 0; bottom: 0; right: auto; top: auto; height: 1px; width: 100%; background-color: #c4c4c4; display: block; z-index: 15; -webkit-transform-origin: 50% 100%; transform-origin: 50% 100%; }\
              #close { position: absolute; left: 0; top: 0; margin-top: 8px; } #title { font-size: 18px; font-weight: bold; display: inline; }",
        xml: "<header id='header'>\
                <Icon id='close'/>\
                <h1 id='title'/>\
              </header>",
        fun: function (sys, items, opts) {
            sys.close.on("touchend", e => this.trigger("close"));
            return { title: sys.title.text };
        }
    },
    Icon: {
        css: "#icon { display: inline-block; none repeat scroll; width: 28px; height: 28px; }\
              #icon svg { fill: currentColor; width: 100%; height: 100%; }",
        xml: "<a id='icon'/>",
        fun: function (sys, items, opts) {
            sys.icon.append(opts.id);
        }
    },
    Close: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M744.747008 310.295552 713.714688 279.264256 512.00512 480.9728 310.295552 279.264256 279.264256 310.295552 480.9728 512.00512 279.264256 713.714688 310.295552 744.747008 512.00512 543.03744 713.714688 744.747008 744.747008 713.714688 543.03744 512.00512Z'/>\
              </svg>"
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}