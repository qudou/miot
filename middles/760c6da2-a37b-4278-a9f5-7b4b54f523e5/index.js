/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("760c6da2-a37b-4278-a9f5-7b4b54f523e5", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<i:Flow id='index' xmlns:i='//miot/middle'>\
                <i:Router id='router' url='/areas/:action'/>\
                <Select id='select'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
              </i:Flow>"
    },
    Select: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let stmt = `SELECT * FROM areas`;
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = [];
                    data.forEach(i => {
                        p.data.push({'id':i.id,'name':i.name,'desc':i.desc});
                    });
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
                let remove = "DELETE FROM areas WHERE id=?";
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
                p.data = {code: -1, desc: "区域名至少2个字符"};
                this.trigger("to-user", p);
            });
        }
    },
    Signup: {
       xml: "<main id='signup'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let stmt = items.db.prepare("INSERT INTO areas (name,desc) VALUES(?,?)");
                stmt.run(p.body.name, p.body.desc);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "注册成功"};
                    sys.signup.trigger("to-user", p);
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
        xml: "<main id='update'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let update = "UPDATE areas SET name=?, desc=? WHERE id=?";
                let stmt = items.db.prepare(update);
                stmt.run(p.body.name,p.body.desc,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-user", p);
                });
            });
        }
    }
});

});