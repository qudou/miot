/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("c4af113c-e299-4b5c-a376-27dfc6665266", (xp, $_) => { // 用户界面

const UID = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Areas id='areas'/>\
                <Links id='links'/>\
                <Apps id='apps'/>\
                <Logout id='logout'/>\
              </main>"
    },
    Areas: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/ui/areas", (e, p) => {
                let stmt = `SELECT distinct areas.* FROM areas,links,apps,auths,status
                            WHERE areas.id = links.area AND links.id = apps.link AND apps.id = auths.app AND auths.user=status.user_id AND status.client_id='${p.cid}' AND apps.id <> '${UID}'
                            ORDER BY areas.id ASC`
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
            this.watch("/ui/links", (e, p) => {
                let stmt = `SELECT distinct links.* FROM links,apps,auths,status
                            WHERE links.area = '${p.body.area}' AND links.id = apps.link AND apps.id = auths.app AND auths.user=status.user_id AND status.client_id='${p.cid}' AND apps.id <> '${UID}'`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = {area: p.body.area, links: data};
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Apps: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/ui/apps", (e, p) => {
                let stmt = `SELECT apps.* FROM apps,auths,status
                            WHERE apps.link = '${p.body.link}' AND apps.id = auths.app AND auths.user=status.user_id AND status.client_id='${p.cid}' AND apps.id <> '${UID}'`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = {link: p.body.link, apps: []};
                    data.forEach(i => {
                        p.data.apps.push({'mid':i.id,'name':i.name,'view':i.view,'type':i.type,'online':i.online});
                    });
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Logout: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/ui/logout", (e, p) => {
                let remove = `DELETE FROM status WHERE client_id=?`;
                let stmt = items.sqlite.prepare(remove);
                stmt.run(p.cid, err => {
                    if (err) throw err;
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});