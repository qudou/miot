/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("d9c69375-2edc-43d3-a2a4-7bd93c31eb4f", (xp, $_) => { // 用户管理

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Select id='select'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
                <Chpasswd id='chpasswd'/>\
              </main>",
        map: { share: "signup/InputCheck" }
    },
    Select: {
        xml: "<Sqlite id='select' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/users/select", (e, p) => {
                let stmt = `SELECT id,name,email,remarks,last_login,livetime,relogin FROM users`;
                items.select.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = [];
                    data.forEach(i => {
                        p.data.push({'id':i.id,'name':i.name,'email':i.email,'remarks':i.remarks, 'last_login':i.last_login, 'livetime':i.livetime,'relogin':i.relogin});
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
            this.watch("/users/signup", (e, p) => sys.validate.trigger("validate", p));
        }
    },
    Remove: {
        xml: "<Sqlite id='remove' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/users/remove", (e, p) => {
                let remove = "DELETE FROM users WHERE id=? AND id<>0";
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
            this.watch("/users/update", (e, p) => sys.validate.trigger("validate", p));
        }
    },
    Chpasswd: {
        xml: "<Falls id='chpasswd' xmlns:i='chpasswd'>\
                <i:Validate id='validate'/>\
                <i:Chpasswd id='chpasswd'/>\
              </Falls>",
        fun: function (sys, items, opts) {
            this.watch("/users/chpasswd", (e, p) => sys.validate.trigger("validate", p));
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
        xml: "<main id='validate'>\
                <Sqlite id='db' xmlns='//miot'/>\
                <InputCheck id='check'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            this.on("validate", (e, p) => {
                e.stopPropagation();
                if (items.check("e", p.body.email) && items.check("u", p.body.name) || items.check("p", p.body.pass))
                    return checkName(p);
                p.data = {code: -1, desc: "邮箱、用户名或密码有误"};
                this.trigger("to-users", p);
            });
            function checkName(p) {
                var stmt = "SELECT * FROM users WHERE name='" + p.body.name + "' LIMIT 1";
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!rows.length)
                        return checkEmail(p);
                    p.data = {code: -1, desc: "用户已存在"};
                    sys.db.trigger("to-users", p);
                });
            }
            function checkEmail(p) {
                var stmt = "SELECT * FROM users WHERE email='" + p.body.email + "' LIMIT 1";
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!rows.length)
                        return checkLivetime(p);
                    p.data = {code: -1, desc: "邮箱已存在"};
                    sys.db.trigger("to-users", p);
                });
            }
            function checkLivetime(p) {
                let livetime = p.body.livetime = parseInt(p.body.livetime);
                if (livetime > 0 && livetime <= 365)
                    return checkRemarks(p);
                p.data = {code: -1, desc: "登录时效范围不对"};
                sys.db.trigger("to-users", p);
            }
            function checkRemarks(p) {
                p.body.remarks = p.body.remarks + "";
                if (p.body.remarks.length <= 256)
                    return sys.db.trigger("next", p);
                p.data = {code: -1, desc: "备注长度不对"};
                sys.db.trigger("to-users", p);
            }
        }
    },
    Signup: {
       xml: "<main id='signup' xmlns:i='//miot'>\
                <i:Sqlite id='db'/>\
                <i:Crypto id='crypto'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("next", async (e, p) => {
                e.stopPropagation();
                let salt = items.crypto.salt();
                let pass = await items.crypto.encrypt(p.body.pass, salt);
                let appid = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";
                let session = Math.random().toString(16).substr(2, 8);
                let statements = [
                    ["INSERT INTO users (email,name,pass,salt,remarks,session,livetime,relogin) VALUES(?,?,?,?,?,?,?,?)",p.body.email, p.body.name, pass, salt, p.body.remarks, session, p.body.livetime, p.body.relogin],
                    ["INSERT INTO auths (user,app) VALUES(last_insert_rowid(),?)", appid]
                ];
                items.db.runBatchAsync(statements).then(results => {
                    p.data = {code: 0, desc: "注册成功"};
                    sys.signup.trigger("to-users", p);
                }).catch(err => {
                    p.data = {code: -1, desc: "BATCH FAILED: " + err};
                    sys.signup.trigger("to-users", p);
                });
            });
        }
    },
    InputCheck: {
        fun: function (sys, items, opts) {
            var ureg = /^[A-Z0-9]{4,}$/i,
                ereg = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
            var table = {u: user, p: pass, e: email};
            function user( v ) {
                return v.length <= 32 && ureg.test(v);
            }
            function pass(v) {
                return 6 <= v.length && v.length <= 16 
            }
            function email(v) {
                return v.length <= 32 && ereg.test(v);
            }
            function check(key, value) {
                return typeof value == "string" && table[key](value);
            }
            return check;
        }
    }
});

$_("update").imports({
    Validate: {
        xml: "<main id='validate'>\
                <Sqlite id='db' xmlns='//miot'/>\
                <InputCheck id='check' xmlns='../signup'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("validate", (e, p) => {
                e.stopPropagation();
                if (items.check("e", p.body.email) && items.check("u", p.body.name))
                    return checkName(p);
                p.data = {code: -1, desc: "邮箱或用户名有误"};
                this.trigger("to-users", p);
            });
            function checkName(p) {
                var stmt = `SELECT * FROM users WHERE id<>'${p.body.id}' AND name='${p.body.name}'`;
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!rows.length)
                        return checkEmail(p);
                    p.data = {code: -1, desc: "用户已存在"};
                    sys.validate.trigger("to-users", p);
                });
            }
            function checkEmail(p) {
                var stmt = `SELECT * FROM users WHERE id<>'${p.body.id}' AND email='${p.body.email}'`;
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!rows.length)
                        return checkRemarks(p);
                    p.data = {code: -1, desc: "邮箱已存在"};
                    sys.validate.trigger("to-users", p);
                });
            }
            function checkRemarks(p) {
                p.body.remarks = p.body.remarks + "";
                if (p.body.remarks.length <= 256)
                    return sys.db.trigger("next", p);
                p.data = {code: -1, desc: "备注长度不对"};
                sys.validate.trigger("to-users", p);
            }
        }
    },
    Update: {
        xml: "<main id='update' xmlns:i='//miot'>\
                <i:Sqlite id='db'/>\
                <i:Crypto id='crypto'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("next", (e, p) => {
                e.stopPropagation();
                let update = "UPDATE users SET name=?,email=?,remarks=?,livetime=?,relogin=? WHERE id=?";
                let stmt = items.db.prepare(update);
                stmt.run(p.body.name,p.body.email,p.body.remarks,p.body.livetime,p.body.relogin,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

$_("chpasswd").imports({
    Validate: {
        xml: "<main id='validate' xmlns:i='../signup' xmlns:k='//miot'>\
                <k:Sqlite id='db'/>\
                <k:Crypto id='crypto'/>\
                <i:InputCheck id='check'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("validate", (e, p) => {
                e.stopPropagation();
                let stmt = `SELECT * FROM users WHERE id='${p.body.id}'`;
                items.db.all(stmt, async (err, rows) => {
                    if (err) throw err;
                    if (!!rows.length && await checkPass(p.body.pass, rows[0]))
                        return checkNewPass(p);
                    p.data = {code: -1, desc: "密码有误"};
                    this.trigger("to-users", p);
                });
            });
            async function checkPass(pass, record) {
                let inputPass = await items.crypto.encrypt(pass, record.salt);
                return inputPass == record.pass;
            }
            function checkNewPass(p) {
                if (items.check("p", p.body.new_pass))
                    return sys.validate.trigger("next", p);
                p.data = {code: -1, desc: "新密码有误"};
                sys.validate.trigger("to-users", p);
            }
        }
    },
    Chpasswd: {
        xml: "<main id='chpasswd'  xmlns:i='//miot'>\
                <i:Sqlite id='db'/>\
                <i:Crypto id='crypto'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("exec", async (e, p) => {
                e.stopPropagation();
                let update = "UPDATE users SET pass=?,salt=? WHERE id=?";
                let salt = items.crypto.salt();
                let pass = await items.crypto.encrypt(p.body.new_pass, salt);
                let stmt = items.db.prepare(update);
                stmt.run(pass, salt, p.body.id, function(err) {
                    if (err) throw err;
                    p.data = this.changes ? {code: 0, desc: "修改成功"} : {code: -1, desc: "修改失败"};
                    sys.chpasswd.trigger("to-users", p);
                });
            });
        }
    }
});

});