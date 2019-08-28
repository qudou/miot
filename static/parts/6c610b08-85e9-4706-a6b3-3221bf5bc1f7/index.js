/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("6c610b08-85e9-4706-a6b3-3221bf5bc1f7", (xp, $_, t) => { //sysinfo

$_().imports({
    Client: {
        xml: "<div id='client'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            console.log(opts);
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
                   <div id='title' class='title'>A+便利店</div>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on("touchend", e => this.trigger("close"));
        }
    },
    Content: {
        css: "#content .page-content div { margin-left: 15px; margin-right: 15px; }\
              #detail { width: 100%; text-align: center; margin: 90px 0 0; }\
              #img { border: 1px solid #AAA; border-radius: 8px; padding: 8px; }\
              #price { color: #ff5745; font-size: 1.35em; }\
              #buy { margin: 10px 0 0; }\
              button#buy {width: calc(100% - 20px); margin: 10px 10px 0;}",
        xml: "<div id='content' class='page'>\
                <div id='detail' class='page-content'>\
                    <img id='img' src='http://www.tongyijia365.com/img/goods/06154.jpg'/>\
                    <div id='price'>￥66.66</div>\
                    <div id='cname'>品名</div>\
                    <button id='buy' class='button button-fill color-blue'>购买</button>\
                </div>\
                <WeixinJSBridge id='wcpay'/>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            let G = {}, Q = {};
            let r = window.location.search.substr(1).split('&');
            r.forEach(pair => {
                let p = pair.split('=');
                Q[p[0]] = p[1];
            });
            sys.buy.on("click", e => {
                let body = { code: Q.code, money: 0.01, spbill_create_ip: returnCitySN["cip"], ln: Q.ln, col: Q.col };
                this.trigger("publish", ["/unifiedorder", body]);
            });
            this.watch("options", (e, o) => {
                //G = o.table[Q.ln][Q.col];
                //sys.price.text('￥'+G["零售价"]);
                //sys.cname.text(G["品名"]);
            });
            sys.wcpay.on("wcpay-success", (e) => {
                //this.trigger("publish", ["drop-goods", {ln: Q.ln, col: Q.col}]);
            });
            this.watch("/unifiedorder", (e, o) => items.wcpay(o));
        }
    },
    WeixinJSBridge: {
        xml: "<main id='bridge'/>",
        fun: function (sys, items, opts) {
            function onBridgeReady(body){
                WeixinJSBridge.invoke('getBrandWCPayRequest', body, res => {
                    if(res.err_msg == "get_brand_wcpay_request:ok" )
                        return sys.bridge.trigger("wcpay-success");
                    sys.bridge.trigger("wcpay-error");
                }); 
            }
            function wcpay(body) {
                if (typeof WeixinJSBridge == "undefined"){
                   if( document.addEventListener ){
                       document.addEventListener('WeixinJSBridgeReady', () => onBridgeReady(body), false);
                   } else if (document.attachEvent){
                       document.attachEvent('WeixinJSBridgeReady', () => onBridgeReady(body)); 
                       document.attachEvent('onWeixinJSBridgeReady', () => onBridgeReady(body));
                   }
                }else{
                   onBridgeReady(body);
                }
            }
            return wcpay;
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}