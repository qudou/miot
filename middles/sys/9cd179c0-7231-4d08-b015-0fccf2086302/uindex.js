/*!
 * index.js v1.0.1
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */
const xmlplus = require("xmlplus");

xmlplus("9cd179c0-7231-4d08-b015-0fccf2086302", (xp, $_) => { // 网关管理

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
        xml: "<Sqlite id='sqlite' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/links/select", async (e, p) => {
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
    Signup: {
        xml: "<Falls id='signup' xmlns:i='signup'>\
                <i:Validate id='validate'/>\
                <i:Signup id='signup'/>\
              </Falls>",
        fun: function (sys, items, opts) {
            this.watch("/links/signup", (e, p) => sys.validate.trigger("validate", p));
        }
    },
    Remove: {
        xml: "<Sqlite id='remove' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/links/remove", (e, p) => {
                let remove = "DELETE FROM links WHERE id=?";
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
            this.watch("/links/update", (e, p) => sys.validate.trigger("validate", p));
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
                p.data = {code: -1, desc: "网关名称至少2个字符"};
                this.trigger("to-users", p);
            });
        }
    },
    Signup: {
       xml: "<Sqlite id='signup' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.on("next", (e, p) => {
                e.stopPropagation();
                let stmt = items.signup.prepare("INSERT INTO links (id,name,area) VALUES(?,?,?)");
                let id = require("uuid/v1")();
                stmt.run(id, p.body.name, p.body.area);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "注册成功"};
                    this.trigger("to-users", p);
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
                let update = "UPDATE links SET id=?, name=?, area=? WHERE id=?";
                let stmt = items.update.prepare(update);
                stmt.run(p.body.new_id,p.body.name,p.body.area,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});