/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("6c610b08-85e9-4706-a6b3-3221bf5bc1f7", (xp, $_, t) => { //leyaoyao

$_().imports({
    Index: {
        xml: "<i:Middle id='middle' xmlns:i='//miot/proxy'>\
                <span id='test'/>\
              </Middle>"
        fun: function (sys, items, opts) {
            sys.test.on("enter", (e, p) => {
                this.trigger("to-local", p);
            });
        }
    }
});

});