/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("b414e216-52c5-4b18-8275-588c92a1f38b", (xp, $_) => { // 应用管理

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Areas id='areas'/>\
                <Apps id='apps'/>\
                <Views id='views'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
              </main>"
    },
    Areas: {
        xml: "<Sqlite id='sqlite' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/apps/areas", async (e, p) => {
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
            this.watch("/apps/list", (e, p) => {
                let stmt = `SELECT id,name,link,part,view,type FROM apps WHERE link='${p.body.link}' AND type<>0`;
                items.apps.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Views: {
        xml: "<Sqlite id='views' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/apps/views", (e, p) => {
                let stmt = `SELECT id,name,desc FROM views WHERE type<>0`;
                items.views.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Signup: {
        xml: "<Falls id='signup' xmlns:i='signup'>\
                <i:Validate id='validate'/>\
                <i:Signup id='signup'/>\
              </Falls>",
        fun: function (sys, items, opts) {
            this.watch("/apps/signup", (e, p) => sys.validate.trigger("validate", p));
        }
    },
    Remove: {
        xml: "<Sqlite id='remove' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/apps/remove", (e, p) => {
                let remove = "DELETE FROM apps WHERE id=?";
                let stmt = items.remove.prepare(remove);
                stmt.run(p.body.id, function (err) {
                    if (err) throw err;
                    p.data = this.changes ? {code: 0, desc: "删除成功"} : {code: -1, desc: "删除失败"};
                    sys.remove.trigger("to-users", p);
                });
            });
        }
    },
    Update: {
        xml: "<Falls id='update' xmlns:i='update'>\
                <i:Validate id='validate'/>\
                <i:Update id='update'/>\
              </Falls>",
        fun: function (sys, items, opts) {
            this.watch("/apps/update", (e, p) => sys.validate.trigger("validate", p));
        }
    },
    Falls: {
        fun: function (sys, items, opts) {
            let kids = this.kids();
            for (i = kids.length-2; i >= 0; i--)
                kids[i+1].append(kids[i]);
        }
    }
});

$_("signup").imports({
    Validate: {
        fun: function ( sys, items, opts ) {
            this.on("validate", (e, p) => {
                e.stopPropagation();
                if (p.body.name.length > 1)
                    return this.trigger("next", p);
                p.data = {code: -1, desc: "应用名称至少2个字符"};
                this.trigger("to-users", p);
            });
        }
    },
    Signup: {
       xml: "<Sqlite id='signup' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            let uuidv1 = require("uuid/v1");
            let uuidv4 = require("uuid/v4");
            this.on("next", (e, p) => {
                e.stopPropagation();
                let b = p.body;
                let id = uuidv1();
                let part = uuidv4();
                let online = b.type > 1 ? 0 : 1; // 0: sys, 1: usr + part, 2: usr - part
                let statements = [
                    ["INSERT INTO apps (id,name,link,part,view,type,online) VALUES(?,?,?,?,?,?,?)", id, b.name, b.link, part, b.view, b.type, online],
                    ["INSERT INTO auths (user,app) VALUES(0,?)", id]
                ];
                items.signup.runBatchAsync(statements).then(results => {
                    p.data = {code: 0, desc: "注册成功"};
                    sys.signup.trigger("to-users", p);
                }).catch(err => {
                    p.data = {code: -1, desc: "BATCH FAILED: " + err};
                    sys.signup.trigger("to-users", p);
                });
            });
        }
    }
});

$_("update").imports({
    Validate: {
        map: {extend: {"from": "../signup/Validate"}}
    },
    Update: {
        xml: "<Sqlite id='update' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            let update = "UPDATE apps SET name=?,link=?,part=?,view=?,type=?,online=? WHERE id=?";
            this.on("next", (e, p) => {
                e.stopPropagation();
                let b = p.body;
                let online = b.type < 2 ? 1 : 0;
                let stmt = items.update.prepare(update);
                stmt.run(b.name,b.link,b.part,b.view,b.type,online,b.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});