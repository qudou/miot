const ClientId = "00000";
const xmlplus = require("xmlplus");

xmlplus("miot", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<Mosca id='index'>\
                <Homes id='homes'/>\
                <Rooms id='rooms'/>\
                <Parts id='parts'/>\
              </Mosca>",
        map: { share: "sqlite/Sqlite" }
    },
    Mosca: {
        xml: "<main id='mosca' xmlns:i='mosca'>\
                <i:Parts id='parts'/>\
                <i:Login id='login'/>\
              </main>",
        opt: { port: 3000, http: { port: 8000, bundle: true, static: "./static" } },
        fun: function (sys, items, opts) {
            let first = this.first(),
                table = this.find("./*[@id]").hash(),
                server = new require('mosca').Server(opts);
            this.on("next", (e, d, next) => {
                d.ptr[0] = table[next] || d.ptr[0].next();
                d.ptr[0] ? d.ptr[0].trigger("enter", d, false) : this.trigger("reject", d);
            });
            this.on("reply", (e, d) => {
                let topic = d.ssid;
                delete d.ptr; delete d.ssid;
                publish(topic, d);
            });
            this.on("reject", (e, d) => {
                d.code = -1;
                this.trigger("reply", d);
            });
            server.on('ready', () => {
                items.parts.updateAll(0);
                server.authenticate = async (client, user, pass, callback) => {
                    callback(null, await items.login(user, pass+''));
                };;
                console.log("Mosca server is up and running");
            });
            server.on('published', (packet, client) => {
                if (packet.topic == "server") {
                    let data = JSON.parse(packet.payload + '');
                    data.ptr = [first];
                    first.trigger("enter", data, false);
                }
            });
            server.on('subscribed', async (topic, client) => {
                if (topic == ClientId) {
                    items.parts.update(topic, 1);
                    return first.trigger("enter", {ssid: topic, topic: "/homes/select", ptr:[first]});
                }
                let part = await items.parts.select(topic)
                if (part.length) {
                    items.parts.update(topic, 1);
                    publish(ClientId, {ssid: topic, data: {online: 1}});
                }
            });
            server.on('unsubscribed', (topic, client) => {
                items.parts.update(topic, 0);
                publish(ClientId, {ssid: topic, data: {online: 0}});
            });
            function publish(topic, payload) {
                server.publish({topic: topic, payload: JSON.stringify(payload), qos: 1, retain: false});
            }
        }
    },
    Homes: {
        xml: "<i:Flow xmlns:i='mosca' xmlns:h='homes'>\
                <i:Router id='router' url='/homes/:action'/>\
                <h:Select id='select'/>\
              </i:Flow>"
    },
    Rooms: {
        xml: "<i:Flow xmlns:i='mosca' xmlns:r='rooms'>\
                <i:Router id='router' url='/rooms/:action'/>\
                <r:Select id='select'/>\
              </i:Flow>"
    },
    Parts: {
        xml: "<i:Flow xmlns:i='mosca' xmlns:p='parts'>\
                <i:Router id='router' url='/parts/:action'/>\
                <p:Select id='select'/>\
              </i:Flow>"
    },
    Signup: {
        xml: "<i:Flow xmlns:i='mosca' xmlns:s='signup'>\
                <i:Router id='router' url='/signup'/>\
                <s:Validate id='validate'/>\
                <s:Register id='register'/>\
              </i:Flow>"
    }
});

$_("mosca").imports({
    Flow: {
        xml: "<main id='flow'/>",
        fun: function (sys, items, opts) {
            let first = this.first(),
                table = this.find("./*[@id]").hash();
            this.on("enter", (e, d, next) => {
                d.ptr.unshift(first);
                first.trigger("enter", d, false);
            });
            this.on("next", (e, d, next) => {
                if ( e.target == sys.flow ) return;
                e.stopPropagation();
                if ( next == null ) {
                    d.ptr[0] = d.ptr[0].next();
                    d.ptr[0] ? d.ptr[0].trigger("enter", d, false) : this.trigger("reject", [d, next]);
                } else if ( table[next] ) {
                    (d.ptr[0] = table[next]).trigger("enter", d, false);
                } else {
                    this.trigger("reject", [d, next]);
                }
            });
            this.on("reject", (e, d, next) => {
                d.ptr.shift();
                e.stopPropagation();
                this.trigger("next", [d, next]);
            });
        }
    },
    Router: {
        xml: "<ParseURL id='router'/>",
        opt: { url: "/*" },
        map: { attrs: {"router": "url"} },
        fun: function (sys, items, opts) {
            this.on("enter", (e, d) => {
                d.args = items.router(d.topic);
                if ( d.args == false )
                    return this.trigger("reject", d);
                this.trigger("next", d);
            });
        }
    },
    ParseURL: {
        fun: function (sys, items, opts) {
            let pathRegexp = require("path-to-regexp"),
                regexp = pathRegexp(opts.url || "/", opts.keys = [], {});
            function decode(val) {
                if ( typeof val !== "string" || val.length === 0 ) return val;
                try {
                    val = decodeURIComponent(val);
                } catch(e) {}
                return val;
            }
            return path => {
                let res = regexp.exec(path);
                if (!res) return false;
                let params = {};
                for (let i = 1; i < res.length; i++) {
                    let key = opts.keys[i - 1], val = decode(res[i]);
                    if (val !== undefined || !(hasOwnProperty.call(params, key.name)))
                        params[key.name] = val;
                }
                return params;
            };
        }
    },
    Login: {
        xml: "<main id='login' xmlns:i='login'>\
                <Sqlite id='sqlite' xmlns='/sqlite'/>\
                <i:Crypto id='crypto'/>\
                <i:InputCheck id='check'/>\
              </main>",
        fun: function (sys, items, opts) {
            function checkName(name, pass) {
                return new Promise((resolve, reject) => {
                    var stmt = "SELECT * FROM users WHERE name='" + name + "' limit 1";
                    items.sqlite.all(stmt, (err, rows) => {
                        if ( err ) { throw err; }
                        resolve(!!rows.length && checkPass(pass, rows[0]));
                    });
                });
            }
            function checkPass(pass, record) {
                return items.crypto.encrypt(pass, record.salt) == record.pass;
            }
            return async (name, pass) => {
                return items.check("u", name) && items.check("p", pass) && await checkName(name, pass);
            };
        }
    },
    Parts: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM parts WHERE id=";
            function select(partId) {
                return new Promise((resolve, reject) => {
                    items.sqlite.all(SELECT + partId, (err, data) => {
                        if ( err ) { throw err; }
                        resolve(data);
                    });
                });
            }
            let UPDATE = "UPDATE parts SET online=? WHERE id=?";
            function update(partId, online) {
                let stmt = items.sqlite.prepare(UPDATE);
                stmt.run(online, partId, err => {
                    if (err) throw err;
                });
            }
            let UPDATE_ALL = "UPDATE parts SET online=?";
            function updateAll(online) {
                let stmt = items.sqlite.prepare(UPDATE_ALL);
                stmt.run(online, err => {
                    if (err) throw err;
                });
            }
            return { select: select, update: update, updateAll: updateAll };
        }
    }
});

$_("mosca/login").imports({
    InputCheck: {
        fun: function (sys, items, opts) {
            var ureg = /^[A-Z0-9]{6,}$/i,
                ereg = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
            var table = { u: user, p: pass, e: email };
            function user( v ) {
                return v.length <= 32 && ureg.test(v);
            }
            function pass( v ) {
                return 6 <= v.length && v.length <= 16 
            }
            function email( v ) {
                return v.length <= 32 && ereg.test(v);
            }
            function check( key, value ) {
                return typeof value == "string" && table[key](value);
            }
            return check;
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
            return { encrypt: encrypt, salt: salt };
        }
    }
});

$_("sinup").imports({
    Validate: {
        xml: "<main id='top' xmlns:h='/mosca/login' xmlns:s='/sqlite'>\
                <s:Sqlite id='sqlite'/>\
                <h:InputCheck id='check'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            this.on("enter", (e, d) => {
                e.stopPropagation();
                if ( items.check("e", d.email) && items.check("u", d.body.name) || items.check("p", d.body.pass) )
                    return checkName(d);
                this.trigger("reject", xp.extend(d, {desc: "邮箱、用户名或密码有误"}));
            });
            function checkName(d) {
                var stmt = "SELECT * FROM users WHERE name='" + d.body.name + "' limit 1";
                items.sqlite.all(stmt, (err, rows) => {
                    if ( err ) { throw err; }
                    if ( !rows.length )
                        return checkEmail(d);
                    this.trigger("reject", xp.extend(d, {desc: "用户已存在"}));
                });
            }
            function checkEmail(d) {
                var stmt = "SELECT * FROM users WHERE email='" + d.body.email + "' limit 1";
                items.sqlite.all(stmt, function(err, rows) {
                    if ( err ) { throw err; }
                    if ( !rows.length )
                        return this.trigger("next", d);
                    this.trigger("reject", xp.extend(d, {desc: "邮箱已存在"}));
                });
            }
        }
    },
    Register: {
       xml: "<main id='top' xmlns:t='/login' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <t:Crypto id='crypto'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            this.on("enter", (e, d) => {
                var salt = items.crypto.salt(),
                    pass = items.crypto.encrypt(d.body.pass, salt),
                    stmt = items.sqlite.prepare("INSERT INTO users (email,name,pass,salt) values(?, ?,?,?)");
                stmt.run(d.body.email, d.body.name, d.body.pass, salt);
                stmt.finalize(e => {
                    this.trigger("reply", xp.extend(d, {desc: "注册成功"}));
                }); 
            });
        }
    }
});

$_("homes").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM homes";
            this.on("enter", (e, d) => {
                items.sqlite.all(SELECT, (err, data) => {
                    if (err) { throw err; }
                    d.data = data;
                    this.trigger("reply", d);
                });
            });
        }
    },
});

$_("rooms").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM rooms WHERE home=";
            this.on("enter", (e, d) => {
                items.sqlite.all(SELECT + d.body.homeId, (err, data) => {
                    if ( err ) { throw err; }
                    d.data = data;
                    this.trigger("reply", d);
                });
            });
        }
    },
});

$_("parts").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM parts WHERE room=";
            this.on("enter", (e, d) => {
                items.sqlite.all(SELECT + d.body.roomId, (err, data) => {
                    if ( err ) { throw err; }
                    d.data = data;
                    this.trigger("reply", d);
                });
            });
        }
    },
    Update: {
        xml: "<main xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Update id='validate'/>\
              </main>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM parts WHERE id=",
                UPDATE = "UPDATE parts SET name=?, room=?, class=?, online=? WHERE id=?";
            this.on("enter", async (e, d) => {
                d.body = xp.extend({}, await select(d.body.id), d.body);
                items.validate(e, d);
            });
            sys.validate.on("success", (e, r) => {
                let d = r.body,
                    stmt = items.sqlite.prepare(UPDATE);
                stmt.run(d.name, d.room, d.class, d.online, d.id, function (err) {
                    if (err) throw err;
                    r.body.code = this.changes ? 0 : -1;
                    sys.sqlite.trigger("reply", r);
                });
            });
            function select(partId) {
                return new Promise((resolve, reject) => {
                    items.sqlite.all(SELECT + partId, (err, data) => {
                        if (err) { throw err; }
                        resolve(data);
                    });
                });
            }
        }
    }
});

$_("parts/validate").imports({
    Validate: {
        fun: function (sys, items, opts) {
            function id(value) {
                return xp.isNumeric(value) && /^\d+$/.test(value + "");
            }
            function name(value) {
                return typeof value == "string" && /^[a-z_][a-z0-9_]*$/i.test(value);
            }
            return { id: id, name: name };
        }
    },
    Update: {
        xml: "<Validate id='validate'/>",
        fun: function (sys, items, opts) {
            let check = items.validate;
            return (e, d) => {
                d.code = check.id(d.body.id) && check.name(d.body.name) ? 0 : -1;
                this.trigger(d.code == 0 ? "success" : "reply", d);
            };
        }
    }
});

$_("sqlite").imports({
    Sqlite: {
        fun: function (sys, items, opts) {
            let sqlite = require("sqlite3").verbose(),
                db = new sqlite.Database("data.db");
			db.exec("VACUUM");
            db.exec("PRAGMA foreign_keys = ON");
            return db;
        }
    },
    Prepare: {
        fun: function (sys, items, opts) {
            return stmt => {
                var args = [].slice.call(arguments).slice(1);
                args.forEach(item => {
                    stmt = stmt.replace("?", typeof item == "string" ? '"' + item + '"' : item);
                });
                return stmt;
            };
        }
    }
});

}).startup("//miot/Index");