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
                <Apps id='apps'/>\
                <Auth id='auth'/>\
              </main>"
    },
    Users: {
        xml: "<Sqlite id='users' xmlns='//miot'/>",
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
        xml: "<Sqlite id='sqlite' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/auths/areas", async (e, p) => {
                p.data = await areas();
                for (let item of p.data)
                    item.links = await links(item.id);
                this.trigger("to-users", p);
            });
            function areas() {
                let stmt = "SELECT * FROM areas WHERE id <> 0";
                return new Promise((resolve, reject) => {
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            function links(areaId) {
                let stmt = `SELECT * FROM links WHERE area = ${areaId}`;
                return new Promise((resolve, reject) => {
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
        }
    },
    Apps: {
        xml: "<Sqlite id='apps' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/auths/apps", async (e, p) => {
                let table = {};
                let apps = await getApps(p.body.link);
                apps.forEach(i => {
                    table[i.id] = i;
                    i.auth = false;
                });
                let auths = await getAuths(p.body.user);
                auths.forEach(i => {
                    table[i.app] && (table[i.app].auth = true);
                });
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
        xml: "<Sqlite id='auth' xmlns='//miot'/>",
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