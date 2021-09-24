const fs = require("fs");
const xmlplus = require("xmlplus");

xmlplus("xsm-to-td365", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
              </main>",
        fun: function (sys, items, opts) {
            process.on('message', (m) => {
              console.log('CHILD got message:', m);
            });
            process.send({ foo: 'bar', baz: NaN });
        }
    }
});

}).startup("//xsm-to-td365/Index");