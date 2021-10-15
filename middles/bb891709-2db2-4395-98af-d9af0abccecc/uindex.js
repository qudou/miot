/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("bb891709-2db2-4395-98af-d9af0abccecc", (xp, $_) => { // 系统状态

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Status id='status'/>\
              </main>"
    },
    Status: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/status", (e, p) => {
                let stmt = "SELECT users.name AS user_name,status.* FROM users,status WHERE users.id=status.user_id";
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});