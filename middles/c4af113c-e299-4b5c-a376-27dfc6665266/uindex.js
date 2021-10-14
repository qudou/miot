/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("c4af113c-e299-4b5c-a376-27dfc6665266", (xp, $_) => { // 用户界面+系统状态

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Areas id='areas'/>\
                <Links id='links'/>\
                <Parts id='parts'/>\
                <Status id='status'/>\
              </main>"
    },
    Areas: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/areas/select", (e, p) => {
                let stmt = `SELECT distinct areas.* FROM areas,links,parts,auths,status
                            WHERE areas.id = links.area AND links.id = parts.link AND parts.id = auths.part AND auths.user=status.user_id AND status.client_id='${p.cid}'`
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Links: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/links/select", (e, p) => {
                let stmt = `SELECT distinct links.* FROM links,parts,auths,status
                            WHERE links.area = '${p.body.area}' AND links.id = parts.link AND parts.id = auths.part AND auths.user=status.user_id AND status.client_id='${p.cid}'`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = {area: p.body.area, links: data};
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Parts: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/parts/select", (e, p) => {
                let stmt = `SELECT parts.* FROM parts,auths,status
                            WHERE parts.link = '${p.body.link}' AND parts.id = auths.part AND auths.user=status.user_id AND status.client_id='${p.cid}'`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = {link: p.body.link, parts: []};
                    data.forEach(i => {
                        p.data.parts.push({'mid':i.id,'name':i.name,'class':i.class,'type':i.type,'online':i.online});
                    });
                    this.trigger("to-users", p);
                });
            });
        }
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