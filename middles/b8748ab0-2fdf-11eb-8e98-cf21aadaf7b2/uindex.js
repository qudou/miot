/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */
const xmlplus = require("xmlplus");
const cp = require('child_process');

xmlplus("b8748ab0-2fdf-11eb-8e98-cf21aadaf7b2", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
              </main>",
        fun: function (sys, items, opts) {
            let n;
            this.watch("/ruku", (e, p) => {
                console.log("ruku");
                if (n) n.disconnect();
                n = cp.fork(`${__dirname}/sub.js`);
                n.on('message', (m) => {
                  console.log('PARENT got message:', m);
                });
                n.send({ hello: 'world' });
            });
        }
    }
});

});