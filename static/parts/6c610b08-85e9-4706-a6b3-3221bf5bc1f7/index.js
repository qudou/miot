/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("6c610b08-85e9-4706-a6b3-3221bf5bc1f7", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<i:ViewStack xmlns:i='//miot'>\
                <Service id='service'/>\
                <Cashier id='cashier'/>\
                <Inventory id='inventory'/>\
              </i:ViewStack>"
    },
    Service: {
        css: "#service { visibility: visible; opacity: 1; background: #EFEFF4; }",
        xml: "<Overlay id='service' xmlns='//miot/verify'/>",
        fun: function (sys, items, opts) {
            this.trigger("publish", "/ready");
            this.watch("/ready", (e, p) => {
                if (!Q.ln) Q.ln = 3, Q.col = 3;
                let g = p[Q.ln][Q.col];
                if (g["库存"] > 0)
                    return this.notify("to-buy", g);
                this.trigger("switch", "inventory").notify("inventory", g);
            });
        }
    },
    Cashier: {
        xml: "<div id='cashier' xmlns:i='cashier'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Inventory: {
        xml: "<div id='inventory' xmlns:i='inventory'>\
                <Navbar id='navbar' xmlns='cashier'/>\
                <i:Content id='content'/>\
              </div>"
    }
});

$_("cashier").imports({
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
            sys.close.on(Click, e => this.trigger("close"));
        }
    },
    Content: {
        css: "#content .page-content div { margin-left: 15px; margin-right: 15px; }\
              #detail { width: 100%; text-align: center; margin: 90px 0 0; }\
              #img { border: 1px solid #AAA; border-radius: 8px; padding: 8px; max-width: calc(80%); max-height: calc(50%); }\
              #price { color: #ff5745; font-size: 1.35em; }\
              #buy { margin: 10px 0 0; }\
              button#buy {width: calc(100% - 20px); margin: 10px 10px 0;}",
        xml: "<div id='content' class='page'>\
                <div id='detail' class='page-content'>\
                    <img id='img'/>\
                    <div id='price'>￥66.66</div>\
                    <div id='cname'>品名</div>\
                    <button id='buy' class='button button-fill color-blue'>购买</button>\
                </div>\
                <WeixinJSBridge id='wcpay'/>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            sys.buy.on("click", e => {
                let body = { code: Q.code, money: 0.01, spbill_create_ip: returnCitySN["cip"], ln: Q.ln, col: Q.col };
                this.trigger("publish", ["/unifiedorder", body]);
            });
            this.watch("to-buy", (e, g) => {
                sys.price.text('￥'+g["售价"]);
                sys.cname.text(g["品名"]);
                sys.img.attr("src", g["图片"]);
                this.trigger("switch", "cashier");
            });
            sys.wcpay.on("wcpay-success", (e) => {
                let text = "正在出货中..., 请耐心等待！";
                app.dialog.alert(text, "提示", () => {
                    WeixinJSBridge.call('closeWindow');
                });
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

$_("inventory").imports({
    Content: {
        css: "#content .page-content div { margin-left: 15px; margin-right: 15px; }\
              #detail { width: 100%; text-align: center; margin: 90px 0 0; }\
              #img { border: 1px solid #AAA; border-radius: 8px; padding: 8px; max-width: calc(80%); max-height: calc(50%); }\
              #price { color: #ff5745; font-size: 1.35em; }\
              #confirm { margin: 10px 0 0; }\
              button#comfirm {width: calc(100% - 20px); margin: 10px 10px 0;}\
              #label { color: red; }",
        xml: "<div id='content' class='page'>\
                <div id='detail' class='page-content'>\
                    <img id='img'/>\
                    <div id='price'>￥66.66</div>\
                    <div id='cname'>品名</div>\
                    <div id='label'>此商品库存不足，暂时无法购买！</div>\
                    <button id='confirm' class='button button-fill color-blue'>确定</button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.confirm.on(Click, () => {
                WeixinJSBridge.call('closeWindow');
            });
            this.watch("inventory", (e, g) => {
                sys.price.text('￥'+g["售价"]);
                sys.cname.text(g["品名"]);
                sys.img.attr("src", g["图片"]);
            });
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}