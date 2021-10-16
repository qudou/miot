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
                <Links id='links'/>\
                <Apps id='apps'/>\
                <Views id='views'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
              </main>"
    },
    Areas: {
        xml: "<Sqlite id='areas' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let stmt = "SELECT id, name FROM areas WHERE id <> 0";
            this.watch("/apps/areas", (e, p) => {
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
            this.watch("/apps/links", (e, p) => {
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
        xml: "<Sqlite id='views' xmlns='//miot/sqlite'/>",
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
        xml: "<Flow id='signup' xmlns:i='signup'>\
                <i:Validate/>\
                <i:Signup/>\
              </Flow>",
        fun: function (sys, items, opts) {
            this.watch("/apps/signup", items.signup.start);
        }
    },
    Remove: {
        xml: "<Sqlite id='remove' xmlns='//miot/sqlite'/>",
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
        xml: "<Flow id='update' xmlns:i='update'>\
                <i:Validate/>\
                <i:Update/>\
              </Flow>",
        fun: function (sys, items, opts) {
            this.watch("/apps/update", items.update.start);
        }
    },
    Flow: {
        fun: function (sys, items, opts) {
            var ptr, first = this.first();
            this.on("next", (e, p) => {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("exec", p, false);
            });
            function start(e, p) {
                ptr = first;
                ptr.trigger("exec", p, false);
            }
            return {start: start};
        }
    }
});

$_("signup").imports({
    Validate: {
        fun: function ( sys, items, opts ) {
            this.on("exec", (e, p) => {
                e.stopPropagation();
                if (p.body.name.length > 1)
                    return this.trigger("next", p);
                p.data = {code: -1, desc: "应用名称至少2个字符"};
                this.trigger("to-users", p);
            });
        }
    },
    Signup: {
       xml: "<Sqlite id='signup' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let uuidv1 = require("uuid/v1");
            let uuidv4 = require("uuid/v4");
            let str = "INSERT INTO apps (id,name,link,part,view,type,online) VALUES(?,?,?,?,?,?,?)";
            this.on("exec", (e, p) => {
                let stmt = items.signup.prepare(str);
                let b = p.body;
                let id = uuidv1();
                let part = uuidv4();
                let online = b.type > 1 ? 0 : 1;
                stmt.run(id,b.name,b.link,part,b.view,b.type,online);
                stmt.finalize(() => insertToAuths(p, id)); 
            });
            function insertToAuths(p, appid) {
                let stmt = items.signup.prepare("INSERT INTO auths (user,app) VALUES(0,?)");
                stmt.run(appid);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "注册成功"};
                    sys.signup.trigger("to-users", p);
                });
            }
        }
    }
});

$_("update").imports({
    Validate: {
        map: {extend: {"from": "../signup/Validate"}}
    },
    Update: {
        xml: "<Sqlite id='update' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let update = "UPDATE apps SET name=?,link=?,part=?,view=?,type=?str WHERE id=?";
            this.on("exec", (e, p) => {
                let b = p.body;
                let s = b.type > 1 ? ',online=1' : '';
                let stmt = items.update.prepare(update.replace("str",s));
                stmt.run(b.name,b.link,b.part,b.view,b.type,b.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});