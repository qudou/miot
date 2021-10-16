/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("9dd8a38b-a406-4679-82d5-dd8b7e3a30b7", (xp, $_) => { // 授权管理

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Users id='users'/>\
                <Areas id='areas'/>\
                <Links id='links'/>\
                <Apps id='apps'/>\
                <Auth id='auth'/>\
              </main>"
    },
    Users: {
        xml: "<Sqlite id='users' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/auths/users", (e, p) => {
                let stmt = `SELECT id,name,email FROM users WHERE id<>0`;
                items.users.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = [];
                    data.forEach(i => {
                        p.data.push({'id':i.id,'name':i.name,'email':i.email});
                    });
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Areas: {
        xml: "<Sqlite id='areas' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let stmt = "SELECT id, name FROM areas WHERE id <> 0";
            this.watch("/auths/areas", (e, p) => {
                items.areas.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Links: {
        xml: "<Sqlite id='links' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let stmt = "SELECT id, name, area FROM links WHERE area<>0 ORDER BY area";
            this.watch("/auths/links", (e, p) => {
                items.links.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Apps: {
        xml: "<Sqlite id='apps' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/auths/apps", async (e, p) => {
                let table = {};
                let apps = await getApps(p.body.link);
                apps.forEach(i=>table[i.id]=i);
                let auths = await getAuths(p.body.user);
                auths.forEach(i=>table[i.app] && (table[i.app].auth = 1));
                p.data = apps;
                this.trigger("to-users", p);
            });
            function getApps(link) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT id,name,link,view FROM apps WHERE link='${link}' AND type<>0`;
                    items.apps.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            function getAuths(user) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM auths WHERE user = ${user}`;
                    items.apps.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
        }
    },
    Auth: {
        xml: "<Sqlite id='auth' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/auths/auth", (e, p) => {
                p.body.auth ? exists(p) : remove(p);
            });
            function exists(p) {
                let stmt = `SELECT * FROM auths WHERE user=${p.body.user} AND app='${p.body.app}'`;
                items.auth.all(stmt, (err, data) => {
                    if (err) throw err;
                    if (!data.length)
                        return insert(p);
                    p.data = {code: 0, desc: "授权成功"};
                    sys.auth.trigger("to-users", p);
                });
            }
            function insert(p) {
                let stmt = items.auth.prepare("INSERT INTO auths (user,app) VALUES(?,?)");
                stmt.run(p.body.user, p.body.app);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "授权成功"};
                    sys.auth.trigger("to-users", p);
                });
            }
            function remove(p) {
                let stmt = items.auth.prepare("DELETE FROM auths WHERE user=? AND app=?");
                stmt.run(p.body.user, p.body.app, function (err) {
                    if (err) throw err;
                    p.data = this.changes ? {code: 0, desc: "删除成功"} : {code: -1, desc: "删除失败"};
                    sys.auth.trigger("to-users", p);
                });
            }
        }
    }
});

});