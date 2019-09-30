/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("b414e216-52c5-4b18-8275-588c92a1f38b", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<i:Flow id='index' xmlns:i='//miot/middle'>\
                <i:Router id='router' url='/parts/:action'/>\
                <Areas id='areas'/>\
                <Links id='links'/>\
                <Parts id='parts'/>\
                <Classes id='classes'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
              </i:Flow>"
    },
    Areas: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let stmt = "SELECT id, name FROM areas WHERE id <> 0";
            this.on("enter", (e, p) => {
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Links: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let stmt = "SELECT id, name, area FROM links WHERE area<>0 ORDER BY area";
            this.on("enter", (e, p) => {
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Parts: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let stmt = `SELECT id,name,link,class FROM parts WHERE link='${p.body.link}' AND type<>0`;
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Classes: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let stmt = `SELECT id,name,desc FROM classes WHERE type<>0`;
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Signup: {
        xml: "<Flow xmlns='//miot/middle' xmlns:i='signup'>\
                <i:Validate id='validate'/>\
                <i:Signup id='signup'/>\
              </Flow>"
    },
    Remove: {
        xml: "<main id='remove'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let remove = "DELETE FROM parts WHERE id=?";
                let stmt = items.db.prepare(remove);
                stmt.run(p.body.id, function (err) {
                    if (err) throw err;
                    p.data = this.changes ? {code: 0, desc: "删除成功"} : {code: -1, desc: "删除失败"};
                    sys.remove.trigger("to-user", p);
                });
            });
        }
    },
    Update: {
        xml: "<Flow xmlns='//miot/middle' xmlns:i='update'>\
                <i:Validate id='validate'/>\
                <i:Update id='update'/>\
              </Flow>"
    }
});

$_("signup").imports({
    Validate: {
        xml: "<main id='validate'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            this.on("enter", (e, p) => {
                e.stopPropagation();
                if (p.body.name.length > 1)
                    return this.trigger("next", p);
                p.data = {code: -1, desc: "配件名称至少2个字符"};
                this.trigger("to-user", p);
            });
        }
    },
    Signup: {
       xml: "<main id='signup'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
              </main>",
        fun: function (sys, items, opts) {
            let uuidv1 = require("uuid/v1");
            this.on("enter", (e, p) => {
                let stmt = items.db.prepare("INSERT INTO parts (id,part,name,link,class) VALUES(?,?,?,?,?)");
                let b = p.body;
                let id = uuidv1();
                let part = uuidv1();
                stmt.run(id,part,b.name,b.link,b.class);
                stmt.finalize(() => insertToAuths(p, id)); 
            });
            function insertToAuths(p, part) {
                let stmt = items.db.prepare("INSERT INTO auths (user,part) VALUES(0,?)");
                stmt.run(part);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "注册成功"};
                    sys.signup.trigger("to-user", p);
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
        xml: "<main id='update'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
              </main>",
        fun: function (sys, items, opts) {
            let update = "UPDATE parts SET name=?,link=?,class=? WHERE id=?";
            this.on("enter", (e, p) => {
                let b = p.body;
                let stmt = items.db.prepare(update);
                stmt.run(b.name,b.link,b.class,b.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-user", p);
                });
            });
        }
    }
});

});