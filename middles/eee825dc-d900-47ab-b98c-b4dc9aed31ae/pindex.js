/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("eee825dc-d900-47ab-b98c-b4dc9aed31ae", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'/>",
        fun: function (sys, items, opts) {
            this.watch("/my/god", (e, p) => {
                console.log(p.data);
                p.body = {text: "My god, Trump!"};
                this.trigger("to-local", p);
            });
        }
    }
});

});