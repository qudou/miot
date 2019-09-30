/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("d9c69375-2edc-43d3-a2a4-7bd93c31eb4f", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<i:Flow id='index' xmlns:i='//miot/middle'>\
                <i:Router id='router' url='/users/:action'/>\
                <Select id='select'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
                <Chpasswd id='chpasswd'/>\
              </i:Flow>",
        map: { share: "signup/Crypto signup/InputCheck" }
    },
    Select: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let stmt = `SELECT id,name,email FROM users`;
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = [];
                    data.forEach(i => {
                        p.data.push({'id':i.id,'name':i.name,'email':i.email});
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
                let remove = "DELETE FROM users WHERE id=?";
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
    },
    Chpasswd: {
        xml: "<Flow xmlns='//miot/middle' xmlns:i='chpasswd'>\
                <i:Validate id='validate'/>\
                <i:Chpasswd id='chpasswd'/>\
              </Flow>"
    }
});

$_("signup").imports({
    Validate: {
        xml: "<main id='validate'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
                <InputCheck id='check'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            this.on("enter", (e, p) => {
                e.stopPropagation();
                if (items.check("e", p.body.email) && items.check("u", p.body.name) || items.check("p", p.body.pass))
                    return checkName(p);
                p.data = {code: -1, desc: "邮箱、用户名或密码有误"};
                this.trigger("to-user", p);
            });
            function checkName(p) {
                var stmt = "SELECT * FROM users WHERE name='" + p.body.name + "' LIMIT 1";
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!rows.length)
                        return checkEmail(p);
                    p.data = {code: -1, desc: "用户已存在"};
                    sys.db.trigger("to-user", p);
                });
            }
            function checkEmail(p) {
                var stmt = "SELECT * FROM users WHERE email='" + p.body.email + "' LIMIT 1";
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!rows.length)
                        return sys.db.trigger("next", p);
                    p.data = {code: -1, desc: "邮箱已存在"};
                    sys.db.trigger("to-user", p);
                });
            }
        }
    },
    Signup: {
       xml: "<main id='signup'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
                <Crypto id='crypto'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                var salt = items.crypto.salt(),
                    pass = items.crypto.encrypt(p.body.pass, salt);
                    stmt = items.db.prepare("INSERT INTO users (email,name,pass,salt) VALUES(?,?,?,?)");
                stmt.run(p.body.email, p.body.name, pass, salt);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "注册成功"};
                    sys.signup.trigger("to-user", p);
                }); 
            });
        }
    },
    Crypto: {
        opt: { keySize: 512/32, iterations: 32 },
        map: { format: { "int": "keySize iterations" } },
        fun: function (sys, items, opts) {
            var cryptoJS = require("crypto-js");
            function encrypt(plaintext, salt) {
                return cryptoJS.PBKDF2(plaintext, salt, opts).toString();
            }
            function salt() {
                return cryptoJS.lib.WordArray.random(128/8).toString();
            }
            function md5(data) {
                return cryptoJS.MD5(data).toString();
            }
            return { encrypt: encrypt, salt: salt, md5: md5 };
        }
    },
    InputCheck: {
        fun: function (sys, items, opts) {
            var ureg = /^[A-Z0-9]{5,}$/i,
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
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
                <InputCheck id='check' xmlns='../signup'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                e.stopPropagation();
                if (items.check("e", p.body.email) && items.check("u", p.body.name))
                    return checkName(p);
                p.data = {code: -1, desc: "邮箱或用户名有误"};
                this.trigger("to-user", p);
            });
            function checkName(p) {
                var stmt = `SELECT * FROM users WHERE id<>'${p.body.id}' AND name='${p.body.name}'`;
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!rows.length)
                        return checkEmail(p);
                    p.data = {code: -1, desc: "用户已存在"};
                    sys.validate.trigger("to-user", p);
                });
            }
            function checkEmail(p) {
                var stmt = `SELECT * FROM users WHERE id<>'${p.body.id}' AND email='${p.body.email}'`;
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!rows.length)
                        return sys.validate.trigger("next", p);
                    p.data = {code: -1, desc: "邮箱已存在"};
                    sys.validate.trigger("to-user", p);
                });
            }
        }
    },
    Update: {
        xml: "<main id='update'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
                <Crypto id='crypto' xmlns='../signup'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let update = "UPDATE users SET name=?, email=? WHERE id=?";
                let stmt = items.db.prepare(update);
                stmt.run(p.body.name,p.body.email,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-user", p);
                });
            });
        }
    }
});

$_("chpasswd").imports({
    Validate: {
        xml: "<main id='validate' xmlns:i='../signup'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
                <i:InputCheck id='check'/>\
                <i:Crypto id='crypto'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                e.stopPropagation();
                let stmt = `SELECT * FROM users WHERE id='${p.body.id}'`;
                items.db.all(stmt, (err, rows) => {
                    if (err) throw err;
                    if (!!rows.length && checkPass(p.body.pass, rows[0]))
                        return checkNewPass(p);
                    p.data = {code: -1, desc: "密码有误"};
                    this.trigger("to-user", p);
                });
            });
            function checkPass(pass, record) {
                return items.crypto.encrypt(pass, record.salt) == record.pass;
            }
            function checkNewPass(p) {
                if (items.check("p", p.body.new_pass))
                    return sys.validate.trigger("next", p);
                p.data = {code: -1, desc: "新密码有误"};
                sys.validate.trigger("to-user", p);
            }
        }
    },
    Chpasswd: {
        xml: "<main id='chpasswd' xmlns:i='../signup'>\
                <Sqlite id='db' xmlns='//miot/sqlite'/>\
                <i:Crypto id='crypto'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let update = "UPDATE users SET pass=?,salt=? WHERE id=?";
                let salt = items.crypto.salt();
                let pass = items.crypto.encrypt(p.body.new_pass, salt);
                let stmt = items.db.prepare(update);
                stmt.run(pass, salt, p.body.id, function(err) {
                    if (err) throw err;
                    p.data = this.changes ? {code: 0, desc: "修改成功"} : {code: -1, desc: "修改失败"};
                    sys.chpasswd.trigger("to-user", p);
                });
            });
        }
    }
});

});