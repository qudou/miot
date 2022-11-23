/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("760c6da2-a37b-4278-a9f5-7b4b54f523e5", (xp, $_) => { // 区域管理

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Select id='select'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
              </main>"
    },
    Select: {
        xml: "<Sqlite id='select' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/areas/select", (e, p) => {
                let stmt = `SELECT * FROM areas WHERE id <> 0`;
                items.select.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = [];
                    data.forEach(i => {
                        p.data.push({'id':i.id,'name':i.name,'desc':i.desc});
                    });
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
            this.watch("/areas/signup", (e, p) => sys.validate.trigger("validate", p));
        }
    },
    Remove: {
        xml: "<Sqlite id='remove' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/areas/remove", (e, p) => {
                let remove = "DELETE FROM areas WHERE id=?";
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
            this.watch("/areas/update", (e, p) => sys.validate.trigger("validate", p));
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
        fun: function (sys, items, opts) {
            this.on("validate", (e, p) => {
                e.stopPropagation();
                if (p.body.name.length > 1)
                    return this.trigger("next", p);
                p.data = {code: -1, desc: "区域名至少2个字符"};
                this.trigger("to-users", p);
            });
        }
    },
    Signup: {
        xml: "<Sqlite id='signup' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.on("next", (e, p) => {
                e.stopPropagation();
                let stmt = items.signup.prepare("INSERT INTO areas (name,desc) VALUES(?,?)");
                stmt.run(p.body.name, p.body.desc);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "注册成功"};
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
            this.on("next", (e, p) => {
                e.stopPropagation();
                let update = "UPDATE areas SET name=?, desc=? WHERE id=?";
                let stmt = items.update.prepare(update);
                stmt.run(p.body.name,p.body.desc,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});